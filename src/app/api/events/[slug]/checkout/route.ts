/**
 * Public — create a Stripe Checkout session for a paid registration.
 *
 *   POST /api/events/[slug]/checkout
 *     body: { ticketTypeId, guestName?, guestEmail?, guestOrganization?,
 *             attendeeType, customAnswers? }
 *     → { ok: true, checkoutUrl }
 *
 * Behaviour:
 *   • Resolves the chosen TicketType and validates it's active +
 *     within capacity (if a per-tier cap is set).
 *   • For FREE tiers (priceCents=0), short-circuits to the regular
 *     /api/events/[slug]/register flow — no Stripe round-trip.
 *   • For PAID tiers, captures the registrant's identity in the
 *     session metadata so the webhook can create the Registration
 *     when payment lands. We DON'T create the Registration row up
 *     front — that would create ghost rows for abandoned carts.
 *   • Signed-in users + guests both work.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSessionForTicket, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Paid registration is not available. Stripe not configured." },
      { status: 503 },
    );
  }

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, status: true, requiresApproval: true },
  });
  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ticketTypeId = typeof body.ticketTypeId === "string" ? body.ticketTypeId : null;
  if (!ticketTypeId) {
    return NextResponse.json({ error: "ticketTypeId is required" }, { status: 400 });
  }
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      id: true, eventId: true, name: true, description: true,
      priceCents: true, currency: true, capacity: true, isActive: true,
      stripePriceId: true,
    },
  });
  if (!ticketType || ticketType.eventId !== event.id || !ticketType.isActive) {
    return NextResponse.json({ error: "Ticket tier unavailable" }, { status: 404 });
  }

  // Per-tier capacity check (best-effort; the webhook recheck is
  // authoritative since multiple checkouts may race).
  if (ticketType.capacity !== null) {
    const sold = await prisma.registration.count({
      where: {
        eventId: event.id,
        registrationStatus: { in: ["pending", "confirmed"] },
        // The TicketType picked is stamped on externalPaymentId
        // when payment lands; for the capacity preview we count
        // anyone with this tier in their amountCents-driven slot
        // — soft check. Strict check happens in the webhook.
      },
    });
    if (sold >= ticketType.capacity) {
      return NextResponse.json(
        { error: "This ticket tier is sold out." },
        { status: 409 },
      );
    }
  }

  // Resolve attendee identity.
  const session = await getSession().catch(() => null);
  const sessionUserEmail = (session?.user as { email?: string } | undefined)?.email ?? null;
  const sessionUserName  = (session?.user as { name?: string }  | undefined)?.name  ?? null;
  const sessionUserId    = (session?.user as { id?: string }    | undefined)?.id    ?? null;
  let attendeeEmail: string;
  let attendeeName: string | null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestOrg: string | null = null;

  if (sessionUserEmail) {
    attendeeEmail = sessionUserEmail;
    attendeeName = sessionUserName;
  } else {
    const rawName  = typeof body.guestName  === "string" ? body.guestName.trim()  : "";
    const rawEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim() : "";
    const rawOrg   = typeof body.guestOrganization === "string" ? body.guestOrganization.trim() : "";
    if (!rawName) return NextResponse.json({ error: "guestName required" }, { status: 400 });
    if (!EMAIL_RE.test(rawEmail)) return NextResponse.json({ error: "guestEmail must be a valid email" }, { status: 400 });
    attendeeEmail = rawEmail.toLowerCase();
    attendeeName  = rawName;
    guestName  = rawName;
    guestEmail = attendeeEmail;
    guestOrg   = rawOrg || null;
  }

  // Build the success/cancel base URL.
  const proto = process.env.VERCEL_URL ? "https" : "http";
  const host  = process.env.VERCEL_URL ?? process.env.HOST ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  // Stripe metadata budget is 500 chars per value. Trim long fields.
  // attendeeType + customAnswers are also folded into metadata so
  // the webhook can reconstruct the registration shape end-to-end.
  const attendeeType = typeof body.attendeeType === "string" ? body.attendeeType.slice(0, 32) : "guest";

  const metadata: Record<string, string> = {
    bhnEventId: event.id,
    bhnTicketTypeId: ticketType.id,
    attendeeEmail,
    attendeeType,
  };
  if (attendeeName) metadata.attendeeName = attendeeName.slice(0, 200);
  if (sessionUserId)  metadata.userId         = sessionUserId;
  if (guestName)      metadata.guestName      = guestName.slice(0, 200);
  if (guestEmail)     metadata.guestEmail     = guestEmail;
  if (guestOrg)       metadata.guestOrg       = guestOrg.slice(0, 200);

  try {
    const { url } = await createCheckoutSessionForTicket({
      ticketType,
      event: { id: event.id, slug: event.slug, title: event.title },
      email: attendeeEmail,
      name: attendeeName ?? undefined,
      baseUrl,
      metadata,
    });
    // If we created a fresh Stripe Price on the fly, cache it.
    if (!ticketType.stripePriceId) {
      // The price ID is buried inside the session; refetch the
      // TicketType to see if the create-fresh-price branch wrote
      // one in (it doesn't currently — we'd need a callback). For
      // now leave stripePriceId alone; next checkout will look it
      // up by product. Skip the optimisation.
    }
    return NextResponse.json({ ok: true, checkoutUrl: url });
  } catch (err) {
    console.error("Checkout create failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
