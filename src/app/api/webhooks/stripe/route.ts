/**
 * Stripe webhook handler.
 *
 *   POST /api/webhooks/stripe
 *     headers: stripe-signature
 *     body:    raw event JSON (signature-verified)
 *
 * Handles:
 *   • checkout.session.completed — payment landed; create Registration.
 *
 * Idempotency: keyed on the Checkout session ID stored in
 * Registration.externalPaymentId. Replays from Stripe (the dashboard
 * "send test event" or a re-delivery) won't create a duplicate row;
 * we surface the existing one instead.
 *
 * Setup:
 *   1. Stripe dashboard → Webhooks → Add endpoint
 *   2. URL: https://<your-domain>/api/webhooks/stripe
 *   3. Events: checkout.session.completed
 *   4. Copy the signing secret → set STRIPE_WEBHOOK_SECRET on Vercel
 *   5. Redeploy
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyWebhook, type Stripe } from "@/lib/stripe";

export const runtime = "nodejs";
// Force-dynamic — webhooks should never be cached.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Stripe signature verification needs the RAW body bytes, not a
  // parsed object. NextRequest preserves the body as a stream we can
  // .text() once.
  const rawBody = await req.text();
  const event = verifyWebhook(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    default:
      // Ignore — we only care about checkout completions for now.
      // Future: payment_intent.payment_failed for failure reporting.
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  const eventId        = metadata.bhnEventId;
  const ticketTypeId   = metadata.bhnTicketTypeId;
  const attendeeEmail  = metadata.attendeeEmail;
  const attendeeType   = metadata.attendeeType ?? "guest";

  if (!eventId || !ticketTypeId || !attendeeEmail) {
    console.error("Stripe webhook missing required metadata:", metadata);
    return;
  }

  // Idempotency: if a Registration already references this Checkout
  // session, do nothing.
  const existing = await prisma.registration.findFirst({
    where: { externalPaymentId: session.id },
    select: { id: true },
  });
  if (existing) return;

  // Resolve event + ticket type for the amount / status logic.
  const eventRow = await prisma.bhnEvent.findUnique({
    where: { id: eventId },
    select: { id: true, requiresApproval: true, maxAttendees: true, waitlistEnabled: true },
  });
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { id: true, eventId: true, priceCents: true, currency: true },
  });
  if (!eventRow || !ticketType || ticketType.eventId !== eventRow.id) {
    console.error("Stripe webhook event/ticket lookup failed:", { eventId, ticketTypeId });
    return;
  }

  // Capacity check at write-time (authoritative). If the event is at
  // capacity now AND waitlist is enabled, place this row on the
  // waitlist anyway — they paid, we owe them either a seat or a
  // refund. Admin handles the refund decision out-of-band for now.
  let registrationStatus: "confirmed" | "pending" | "waitlist" = "confirmed";
  let waitlistPosition: number | null = null;
  if (eventRow.requiresApproval) {
    registrationStatus = "pending";
  } else if (eventRow.maxAttendees !== null) {
    const activeCount = await prisma.registration.count({
      where: { eventId: eventRow.id, registrationStatus: { in: ["pending", "confirmed"] } },
    });
    if (activeCount >= eventRow.maxAttendees) {
      if (eventRow.waitlistEnabled) {
        registrationStatus = "waitlist";
        const highest = await prisma.registration.findFirst({
          where: { eventId: eventRow.id, registrationStatus: "waitlist", waitlistPosition: { not: null } },
          orderBy: { waitlistPosition: "desc" },
          select: { waitlistPosition: true },
        });
        waitlistPosition = (highest?.waitlistPosition ?? 0) + 1;
      } else {
        // Capacity-full + no waitlist + payment landed = needs refund.
        // Admin handles it out-of-band; we log loudly + still create
        // the row so audit is intact.
        console.error(
          "Stripe payment received for full event with closed waitlist — refund required:",
          { eventId: eventRow.id, sessionId: session.id, attendeeEmail },
        );
        registrationStatus = "waitlist"; // softer fallback for the admin queue
      }
    }
  }

  const qrToken = randomBytes(16).toString("hex");
  await prisma.registration.create({
    data: {
      eventId: eventRow.id,
      userId: metadata.userId || null,
      guestName: metadata.guestName || null,
      guestEmail: metadata.guestEmail || (metadata.userId ? null : attendeeEmail),
      guestOrganization: metadata.guestOrg || null,
      attendeeType,
      registrationStatus,
      waitlistPosition,
      approvedAt: registrationStatus === "confirmed" ? new Date() : null,
      includesSymposiumDay: true,
      paymentProvider: "stripe",
      paymentStatus: "paid",
      externalPaymentId: session.id,
      amountCents: ticketType.priceCents,
      currency: ticketType.currency,
      qrToken,
    },
  });

  // The success page reads ?session_id=… and the registration is now
  // queryable by externalPaymentId for the friendly redirect. We
  // don't send the branded confirmation email from here yet — that's
  // a small follow-up (mirror the logic from /api/events/[slug]/register).
}
