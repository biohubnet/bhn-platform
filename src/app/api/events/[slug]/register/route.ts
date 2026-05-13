/**
 * Event registration.
 *
 *   POST /api/events/[slug]/register
 *     body: { attendeeType, dietaryRestrictions?, accessibilityNeeds?,
 *             includesSymposiumDay?, workshopIds?: string[] }
 *
 * Behaviour
 *   • Auth-gated. Anonymous → 401 (the form should redirect through
 *     /login before posting, but we re-check server-side).
 *   • Slug must resolve to a published BhnEvent. Otherwise 404.
 *   • Registration window honoured when set (registrationOpensAt /
 *     registrationClosesAt). Outside window → 403.
 *   • Idempotent. If a Registration already exists for (event, user),
 *     return it as-is and DO NOT touch their existing workshop
 *     bookings — they have a dedicated UI at /me/workshops for that.
 *     The (eventId, userId) unique constraint guarantees one row per
 *     pair; we surface it instead of crashing on a P2002.
 *   • qrToken is 128-bit hex generated server-side, never reused.
 *   • workshopIds (optional) lets the registration form double as a
 *     workshop-pick form. Every workshop is booked inside the same
 *     transaction as the Registration insert — partial failures roll
 *     back the whole thing. Capacity-full slots become waitlist
 *     bookings; the caller gets the per-workshop status back so the
 *     UI can show "confirmed × 2" / "1 confirmed, 1 waitlisted".
 *     Max length: MAX_WORKSHOPS_PER_USER (2).
 *   • Confirmation email is best-effort. SMTP failures don't fail the
 *     registration — the user can still see their QR on the success
 *     page even if the email never lands.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";
import { bookWorkshopInTx } from "@/lib/events/bookings";
import { MAX_WORKSHOPS_PER_USER } from "@/lib/events/constants";

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
      requiresApproval: true,
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
    workshopIds: rawWorkshopIds,
  } = body as Record<string, unknown>;

  if (!isAttendeeType(attendeeType)) {
    return NextResponse.json(
      { error: `attendeeType must be one of: ${VALID_ATTENDEE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // workshopIds validation. Optional; if present must be an array of
  // strings up to the per-user cap. Dedupe defensively in case the
  // client double-toggled the same option.
  let workshopIds: string[] = [];
  if (rawWorkshopIds !== undefined) {
    if (!Array.isArray(rawWorkshopIds) || !rawWorkshopIds.every((id) => typeof id === "string")) {
      return NextResponse.json(
        { error: "workshopIds must be an array of strings" },
        { status: 400 },
      );
    }
    workshopIds = Array.from(new Set(rawWorkshopIds as string[]));
    if (workshopIds.length > MAX_WORKSHOPS_PER_USER) {
      return NextResponse.json(
        { error: `Pick at most ${MAX_WORKSHOPS_PER_USER} workshops.` },
        { status: 400 },
      );
    }
    // Pre-flight: every requested workshop must belong to THIS event
    // and be active. Cheaper than failing inside the transaction.
    if (workshopIds.length > 0) {
      const validWorkshops = await prisma.workshop.findMany({
        where: { id: { in: workshopIds }, eventId: event.id, isActive: true },
        select: { id: true },
      });
      if (validWorkshops.length !== workshopIds.length) {
        return NextResponse.json(
          { error: "One or more selected workshops are no longer available." },
          { status: 400 },
        );
      }
    }
  }

  const clean = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    return trimmed.slice(0, max);
  };

  const qrToken = randomBytes(16).toString("hex");

  // One transaction creates the Registration AND books any selected
  // workshops. Partial failures (e.g. a workshop fills up mid-flight)
  // roll back the registration too, so the user never ends up
  // half-signed-up. Per-workshop results are returned to the client
  // so the success surface can say "1 confirmed, 1 on waitlist".
  //
  // Registration starts in `pending` whenever event.requiresApproval
  // is true — the events team reviews and approves from the admin
  // queue. Workshop bookings independently honour Workshop.requires
  // Approval (see bookWorkshopInTx for the per-booking decision).
  type WorkshopBookingOutcome = {
    workshopId: string;
    status: "pending" | "confirmed" | "waitlist";
    waitlistPosition: number | null;
  };

  const initialRegistrationStatus = event.requiresApproval ? "pending" : "confirmed";

  let registration: {
    id: string;
    qrToken: string;
    registrationStatus: string;
  };
  let workshopOutcomes: WorkshopBookingOutcome[] = [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.create({
        data: {
          eventId: event.id,
          userId,
          attendeeType,
          registrationStatus: initialRegistrationStatus,
          // Stamp approvedAt only when we auto-confirm — keeps the
          // pending-queue admin view honest.
          approvedAt: initialRegistrationStatus === "confirmed" ? new Date() : null,
          includesSymposiumDay: includesSymposiumDay !== false, // default true
          paymentProvider: "free",
          paymentStatus: "waived",
          amountCents: 0,
          currency: "CAD",
          qrToken,
          dietaryRestrictions: clean(dietaryRestrictions, 500),
          accessibilityNeeds: clean(accessibilityNeeds, 1000),
        },
        select: { id: true, qrToken: true, registrationStatus: true },
      });

      const outcomes: WorkshopBookingOutcome[] = [];
      for (const wId of workshopIds) {
        const r = await bookWorkshopInTx(tx, userId, wId);
        if (!r.ok) {
          // Surface the booking-service error verbatim so the user
          // sees something actionable ("you can book at most 2…",
          // etc.). Throwing aborts the transaction and rolls back
          // the registration insert above.
          throw new Error(`booking_failed:${r.code}:${r.error}`);
        }
        outcomes.push({
          workshopId: wId,
          status: r.status,
          waitlistPosition: r.waitlistPosition,
        });
      }
      return { reg, outcomes };
    });
    registration = result.reg;
    workshopOutcomes = result.outcomes;
  } catch (err) {
    const message = (err as Error).message;
    if (message.startsWith("booking_failed:")) {
      const parts = message.split(":");
      const code = parts[1] ?? "unknown";
      const detail = parts.slice(2).join(":") || "Workshop booking failed.";
      return NextResponse.json({ error: detail, code }, { status: 400 });
    }
    throw err;
  }

  // Resolve workshop titles for the email body + response payload.
  // One query keeps it cheap.
  const bookedWorkshops = workshopOutcomes.length
    ? await prisma.workshop.findMany({
        where: { id: { in: workshopOutcomes.map((o) => o.workshopId) } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(bookedWorkshops.map((w) => [w.id, w.title]));

  // Best-effort confirmation email — don't fail the registration if
  // SMTP isn't configured (dev / preview deploys) or if the send
  // itself throws.
  const isPending = registration.registrationStatus === "pending";
  if (mailConfigured()) {
    const eventDates = formatEventDates(event.startDate, event.endDate, event.timezone);
    const greeting = userName ? `Hi ${userName.split(/\s+/)[0]},` : "Hi,";

    const workshopLines = workshopOutcomes.map((o) => {
      const title = titleById.get(o.workshopId) ?? "Workshop";
      if (o.status === "pending") {
        return `  • ${title} — request received (pending admin approval)`;
      }
      return o.status === "confirmed"
        ? `  ✓ ${title} — confirmed`
        : `  • ${title} — waitlisted (position ${o.waitlistPosition ?? "?"})`;
    });

    const workshopBlock = workshopLines.length
      ? `Your workshop picks:\n${workshopLines.join("\n")}\n\n`
      : "";

    const approvalNotice = isPending
      ? `Your registration is **pending admin approval**. Your spot is not ` +
        `guaranteed until the BHN events team confirms it — we'll email you ` +
        `as soon as it's approved (usually within 1–2 business days).\n\n`
      : "";

    const text =
      `${greeting}\n\n` +
      `${isPending ? "Thanks for registering for" : "You're registered for"} ${event.title}.\n\n` +
      approvalNotice +
      `When: ${eventDates}\n` +
      `Where: ${event.mainVenueName ?? "TBA"}` +
      (event.mainVenueAddress ? ` · ${event.mainVenueAddress}` : "") +
      `\n\n` +
      workshopBlock +
      `Your check-in code: ${qrToken}\n` +
      `(We'll scan this at the door — bring the confirmation page or this email on your phone.)\n\n` +
      `What's next:\n` +
      (workshopOutcomes.length < 2
        ? `• Pick ${2 - workshopOutcomes.length} more workshop${2 - workshopOutcomes.length === 1 ? "" : "s"} from the Training Week\n`
        : "") +
      `• Choose which afternoon breakout you'll attend on the symposium day\n` +
      `• Find everything at: /events/${event.slug}/me\n\n` +
      `Questions? Reply to this email or contact the BHN team at support@biohubnet.ca.\n\n` +
      `— BioHubNet`;

    try {
      await sendMail({
        to: userEmail,
        subject: isPending
          ? `Registration received — ${event.title} (pending approval)`
          : `You're registered for ${event.title}`,
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
    pendingApproval: isPending,
    registration: {
      id: registration.id,
      qrToken: registration.qrToken,
      registrationStatus: registration.registrationStatus,
    },
    workshops: workshopOutcomes.map((o) => ({
      workshopId: o.workshopId,
      title: titleById.get(o.workshopId) ?? null,
      status: o.status,
      waitlistPosition: o.waitlistPosition,
    })),
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
