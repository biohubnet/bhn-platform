/**
 * Event registration.
 *
 *   POST /api/events/[slug]/register
 *     body: { attendeeType, dietaryRestrictions?, accessibilityNeeds?,
 *             includesSymposiumDay? }
 *
 * Behaviour
 *   • Auth-gated. Anonymous → 401 (the form should redirect through
 *     /login before posting, but we re-check server-side).
 *   • Slug must resolve to a published BhnEvent. Otherwise 404.
 *   • Registration window honoured when set (registrationOpensAt /
 *     registrationClosesAt). Outside window → 403.
 *   • Idempotent. If a Registration already exists for (event, user),
 *     return it as-is. The (eventId, userId) unique constraint
 *     guarantees one row per pair; we surface it instead of crashing
 *     on a P2002.
 *   • qrToken is 128-bit hex generated server-side, never reused.
 *   • Confirmation email is best-effort. SMTP failures don't fail the
 *     registration — the user can still see their QR on the success
 *     page even if the email never lands.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";

export const runtime = "nodejs";

const VALID_ATTENDEE_TYPES = [
  "trainee",
  "industry",
  "academic",
  "student",
  "sponsor",
  "guest",
] as const;
type AttendeeType = (typeof VALID_ATTENDEE_TYPES)[number];

function isAttendeeType(s: unknown): s is AttendeeType {
  return typeof s === "string" && (VALID_ATTENDEE_TYPES as readonly string[]).includes(s);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  const userEmail = (session.user as { email?: string }).email ?? null;
  const userName = (session.user as { name?: string }).name ?? null;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      status: true,
      startDate: true,
      endDate: true,
      mainVenueName: true,
      mainVenueAddress: true,
      timezone: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
    },
  });
  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Registration window — honour when set, ignore when null.
  const now = new Date();
  if (event.registrationOpensAt && event.registrationOpensAt > now) {
    return NextResponse.json(
      {
        error: "Registration hasn't opened yet.",
        code: "not_yet_open",
        opensAt: event.registrationOpensAt.toISOString(),
      },
      { status: 403 },
    );
  }
  if (event.registrationClosesAt && event.registrationClosesAt < now) {
    return NextResponse.json(
      {
        error: "Registration is closed.",
        code: "closed",
        closedAt: event.registrationClosesAt.toISOString(),
      },
      { status: 403 },
    );
  }

  // Idempotency — surface the existing registration if any.
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyRegistered: true,
      registration: { id: existing.id, qrToken: existing.qrToken },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const {
    attendeeType,
    dietaryRestrictions,
    accessibilityNeeds,
    includesSymposiumDay,
  } = body as Record<string, unknown>;

  if (!isAttendeeType(attendeeType)) {
    return NextResponse.json(
      { error: `attendeeType must be one of: ${VALID_ATTENDEE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const clean = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    return trimmed.slice(0, max);
  };

  const qrToken = randomBytes(16).toString("hex");

  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      userId,
      attendeeType,
      registrationStatus: "confirmed",
      includesSymposiumDay: includesSymposiumDay !== false, // default true
      paymentProvider: "free",
      paymentStatus: "waived",
      amountCents: 0,
      currency: "CAD",
      qrToken,
      dietaryRestrictions: clean(dietaryRestrictions, 500),
      accessibilityNeeds: clean(accessibilityNeeds, 1000),
    },
    select: { id: true, qrToken: true },
  });

  // Best-effort confirmation email — don't fail the registration if
  // SMTP isn't configured (dev / preview deploys) or if the send
  // itself throws.
  if (mailConfigured()) {
    const eventDates = formatEventDates(event.startDate, event.endDate, event.timezone);
    const greeting = userName ? `Hi ${userName.split(/\s+/)[0]},` : "Hi,";
    const text =
      `${greeting}\n\n` +
      `You're registered for ${event.title}.\n\n` +
      `When: ${eventDates}\n` +
      `Where: ${event.mainVenueName ?? "TBA"}` +
      (event.mainVenueAddress ? ` · ${event.mainVenueAddress}` : "") +
      `\n\n` +
      `Your check-in code: ${qrToken}\n` +
      `(We'll scan this at the door — bring the confirmation page or this email on your phone.)\n\n` +
      `What's next:\n` +
      `• Pick the workshops you want to attend from the Training Week (max 2)\n` +
      `• Choose which afternoon breakout you'll attend on the symposium day\n` +
      `• Find both at: /events/${event.slug}/me\n\n` +
      `Questions? Reply to this email or contact the BHN team at support@biohubnet.ca.\n\n` +
      `— BioHubNet`;

    try {
      await sendMail({
        to: userEmail,
        subject: `You're registered for ${event.title}`,
        text,
      });
    } catch (err) {
      // Swallow — email is best-effort. Surface in logs so ops can
      // see SMTP issues without breaking the user-facing flow.
      console.error("Registration email send failed:", (err as Error).message);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyRegistered: false,
    registration: { id: registration.id, qrToken: registration.qrToken },
  });
}

function formatEventDates(start: Date, end: Date, timeZone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone });
  const startStr = fmt(start);
  const endStr = fmt(end);
  const year = end.toLocaleDateString("en-CA", { year: "numeric", timeZone });
  if (startStr === endStr) return `${startStr}, ${year}`;
  return `${startStr}–${endStr.replace(/^[A-Za-z]+\s+/, "")}, ${year}`;
}
