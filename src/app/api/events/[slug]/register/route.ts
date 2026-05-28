/**
 * Event registration — supports BOTH signed-in users AND anonymous guests.
 *
 *   POST /api/events/[slug]/register
 *     body (signed-in): {
 *       attendeeType, dietaryRestrictions?, accessibilityNeeds?,
 *       includesSymposiumDay?, workshopIds?: string[]
 *     }
 *     body (guest): {
 *       guestName, guestEmail, guestOrganization?,
 *       attendeeType, dietaryRestrictions?, accessibilityNeeds?,
 *       includesSymposiumDay?
 *       (workshopIds not allowed — workshop booking requires an account)
 *     }
 *
 * Behaviour
 *   • Two paths gated by session presence:
 *     - Session present → user-registration path (original behaviour).
 *     - No session → guest-registration path. Requires guestName +
 *       guestEmail in the body. workshopIds is rejected here because
 *       the workshop-booking model assumes a User row.
 *   • Slug must resolve to a published BhnEvent. Otherwise 404.
 *   • Registration window honoured when set (registrationOpensAt /
 *     registrationClosesAt). Outside window → 403.
 *   • Idempotent on both paths:
 *     - signed-in: (eventId, userId) — return existing row.
 *     - guest: (eventId, guestEmail-lowercased) — return existing row.
 *   • qrToken is 128-bit hex generated server-side, never reused.
 *   • Confirmation email is best-effort. SMTP failures don't fail the
 *     registration — the user can still see their QR on the success
 *     page even if the email never lands.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";
import { bookWorkshopInTx } from "@/lib/events/bookings";
import { MAX_WORKSHOPS_PER_USER } from "@/lib/events/constants";
import { renderRegistrationConfirmation } from "@/lib/email/templates/registration-confirmation";
import { buildIcs } from "@/lib/events/ics";
import { toE164 } from "@/lib/sms";

// Bare-bones RFC-5322-ish email regex. Not a full parse — guard
// against obvious typos / missing @ on the guest path. Real validation
// happens when we try to send the confirmation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  // Soft session lookup — present → user path, absent → guest path.
  // Neither rejects upfront.
  const session = await getSession().catch(() => null);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const sessionUserEmail = (session?.user as { email?: string } | undefined)?.email ?? null;
  const sessionUserName = (session?.user as { name?: string } | undefined)?.name ?? null;
  const isGuestPath = !sessionUserId || !sessionUserEmail;

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      mainVenueName: true,
      mainVenueAddress: true,
      mainVenueMapUrl: true,
      timezone: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      requiresApproval: true,
      maxAttendees: true,
      waitlistEnabled: true,
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

  // Parse the body first — both paths need it, and the guest path
  // depends on it for the idempotency check.
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
    guestName: rawGuestName,
    guestEmail: rawGuestEmail,
    guestOrganization: rawGuestOrg,
    guestPhone: rawGuestPhone,
    smsOptIn: rawSmsOptIn,
    customAnswers: rawCustomAnswers,
  } = body as Record<string, unknown>;

  // SMS opt-in + phone — accepted on both paths. We only store the
  // phone when smsOptIn is true AND the number normalises to E.164.
  // Invalid numbers are dropped (not an error) so a typo doesn't
  // block the registration.
  const smsOptIn = rawSmsOptIn === true;
  let normalisedPhone: string | null = null;
  if (smsOptIn && typeof rawGuestPhone === "string") {
    normalisedPhone = toE164(rawGuestPhone);
  }

  // Guest path needs name + email. Validate up front so we fail
  // cheap before touching the DB.
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestOrganization: string | null = null;
  if (isGuestPath) {
    if (typeof rawGuestName !== "string" || rawGuestName.trim().length === 0) {
      return NextResponse.json(
        { error: "guestName is required when not signed in." },
        { status: 400 },
      );
    }
    if (typeof rawGuestEmail !== "string" || !EMAIL_RE.test(rawGuestEmail.trim())) {
      return NextResponse.json(
        { error: "guestEmail must be a valid email address." },
        { status: 400 },
      );
    }
    guestName = rawGuestName.trim().slice(0, 120);
    // Lower-case the email so duplicate detection is case-insensitive.
    guestEmail = rawGuestEmail.trim().toLowerCase().slice(0, 200);
    if (typeof rawGuestOrg === "string" && rawGuestOrg.trim().length > 0) {
      guestOrganization = rawGuestOrg.trim().slice(0, 160);
    }
    // Workshop booking requires a User row; not available on the
    // guest path. Reject early rather than silently dropping the field.
    if (rawWorkshopIds !== undefined && Array.isArray(rawWorkshopIds) && rawWorkshopIds.length > 0) {
      return NextResponse.json(
        { error: "Workshop bookings require a platform account. Sign in to pick workshops." },
        { status: 400 },
      );
    }
  }

  // Idempotency — surface the existing registration if any. Different
  // unique constraint per path: (event, userId) vs (event, guestEmail).
  const existing = isGuestPath
    ? await prisma.registration.findUnique({
        where: { eventId_guestEmail: { eventId: event.id, guestEmail: guestEmail! } },
      })
    : await prisma.registration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: sessionUserId! } },
      });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyRegistered: true,
      registration: { id: existing.id, qrToken: existing.qrToken },
    });
  }

  if (!isAttendeeType(attendeeType)) {
    return NextResponse.json(
      { error: `attendeeType must be one of: ${VALID_ATTENDEE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // workshopIds validation — signed-in path only. Optional; if
  // present must be an array of strings up to the per-user cap.
  // Dedupe defensively in case the client double-toggled the same
  // option. Guest path rejected this above already.
  let workshopIds: string[] = [];
  if (!isGuestPath && rawWorkshopIds !== undefined) {
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

  // Capacity check — only when the event has a maxAttendees cap set.
  // Count rows that occupy a seat: pending + confirmed. Waitlisted +
  // cancelled rows don't count against capacity.
  let goingToWaitlist = false;
  let nextWaitlistPosition: number | null = null;
  if (event.maxAttendees !== null) {
    const activeCount = await prisma.registration.count({
      where: {
        eventId: event.id,
        registrationStatus: { in: ["pending", "confirmed"] },
      },
    });
    if (activeCount >= event.maxAttendees) {
      if (!event.waitlistEnabled) {
        return NextResponse.json(
          {
            error: "This event is full and the waitlist is closed.",
            code: "full",
          },
          { status: 403 },
        );
      }
      goingToWaitlist = true;
      // Position = highest existing waitlist position + 1.
      // Leaves gaps when middle positions cancel — by design (we
      // promise the person they're "#3" and don't want to renumber
      // them later).
      const highest = await prisma.registration.findFirst({
        where: {
          eventId: event.id,
          registrationStatus: "waitlist",
          waitlistPosition: { not: null },
        },
        orderBy: { waitlistPosition: "desc" },
        select: { waitlistPosition: true },
      });
      nextWaitlistPosition = (highest?.waitlistPosition ?? 0) + 1;
    }
  }

  // initialRegistrationStatus priority order:
  //   1. waitlist (event at capacity + waitlist on)
  //   2. pending (event.requiresApproval)
  //   3. confirmed (auto-confirm)
  const initialRegistrationStatus = goingToWaitlist
    ? "waitlist"
    : event.requiresApproval
      ? "pending"
      : "confirmed";

  let registration: {
    id: string;
    qrToken: string;
    registrationStatus: string;
    waitlistPosition: number | null;
  };
  let workshopOutcomes: WorkshopBookingOutcome[] = [];

  // Validate custom-question answers against the event's question
  // set. Required questions must have a non-empty answer; unknown
  // question IDs are ignored (they came from a stale form).
  const eventQuestions = await prisma.customRegQuestion.findMany({
    where: { eventId: event.id },
    select: { id: true, required: true, kind: true },
  });
  const validQuestionIds = new Set(eventQuestions.map((q) => q.id));
  const customAnswerMap = new Map<string, string>();
  if (rawCustomAnswers !== null && typeof rawCustomAnswers === "object") {
    for (const [qId, raw] of Object.entries(rawCustomAnswers as Record<string, unknown>)) {
      if (!validQuestionIds.has(qId)) continue;
      if (typeof raw !== "string") continue;
      const v = raw.trim().slice(0, 4000);
      if (v.length === 0) continue;
      customAnswerMap.set(qId, v);
    }
  }
  for (const q of eventQuestions) {
    if (q.required && !customAnswerMap.has(q.id)) {
      return NextResponse.json(
        { error: `A required question is missing an answer.`, code: "missing_required_question", questionId: q.id },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.create({
        data: {
          eventId: event.id,
          // Either userId OR guest fields — never both populated.
          userId: isGuestPath ? null : sessionUserId,
          guestEmail: isGuestPath ? guestEmail : null,
          guestName: isGuestPath ? guestName : null,
          guestOrganization: isGuestPath ? guestOrganization : null,
          guestPhone: normalisedPhone,
          smsOptIn: smsOptIn && normalisedPhone !== null,
          attendeeType,
          registrationStatus: initialRegistrationStatus,
          waitlistPosition: nextWaitlistPosition,
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
        select: { id: true, qrToken: true, registrationStatus: true, waitlistPosition: true },
      });

      // Persist any custom-question answers in the same transaction.
      // Unknown / non-validated question IDs were dropped above.
      if (customAnswerMap.size > 0) {
        await tx.customRegAnswer.createMany({
          data: Array.from(customAnswerMap.entries()).map(([questionId, value]) => ({
            registrationId: reg.id,
            customRegQuestionId: questionId,
            value,
          })),
        });
      }

      const outcomes: WorkshopBookingOutcome[] = [];
      // Guest path can't book workshops (no userId for the workshop
      // booking row). The guard above already rejects guestIds with
      // workshopIds, so workshopIds is empty here on the guest path.
      if (!isGuestPath && sessionUserId) {
        for (const wId of workshopIds) {
          const r = await bookWorkshopInTx(tx, sessionUserId, wId);
          if (!r.ok) {
            throw new Error(`booking_failed:${r.code}:${r.error}`);
          }
          outcomes.push({
            workshopId: wId,
            status: r.status,
            waitlistPosition: r.waitlistPosition,
          });
        }
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
  // itself throws. Email recipient + display name resolve from
  // whichever path created this row.
  const recipientEmail = isGuestPath ? guestEmail! : sessionUserEmail!;
  const recipientName  = isGuestPath ? guestName  : sessionUserName;
  const isPending     = registration.registrationStatus === "pending";
  const isWaitlisted  = registration.registrationStatus === "waitlist";
  if (mailConfigured()) {
    // Workshop summary lines for the email body (signed-in users
    // only; guest path has zero workshop outcomes by design).
    const workshopLines = workshopOutcomes.map((o) => {
      const title = titleById.get(o.workshopId) ?? "Workshop";
      if (o.status === "pending") return `${title} — request received (pending admin approval)`;
      return o.status === "confirmed"
        ? `${title} — confirmed`
        : `${title} — waitlisted (position ${o.waitlistPosition ?? "?"})`;
    });

    // Compose the public URLs the email links to. Vercel exposes the
    // deploy hostname via VERCEL_URL (without protocol); fall back to
    // a sensible local default for dev/preview.
    const proto = process.env.VERCEL_URL ? "https" : "http";
    const host  = process.env.VERCEL_URL ?? process.env.HOST ?? "localhost:3000";
    const eventPageUrl   = `${proto}://${host}/events/${event.slug}`;
    const successPageUrl = `${proto}://${host}/events/${event.slug}/register/success?token=${encodeURIComponent(qrToken)}`;

    // Detect online events (matches the public-page logic).
    const isOnline =
      event.mainVenueName === "Online" ||
      (!!event.mainVenueMapUrl && !event.mainVenueAddress);

    // Render the branded HTML email + plain-text fallback.
    const { subject, text, html } = renderRegistrationConfirmation({
      recipientName: recipientName,
      recipientEmail,
      eventTitle: event.title,
      eventStart: event.startDate,
      eventEnd: event.endDate,
      eventTimezone: event.timezone,
      venueName: event.mainVenueName,
      venueAddress: event.mainVenueAddress,
      meetingUrl: event.mainVenueMapUrl,
      isOnline,
      qrToken,
      status: isWaitlisted ? "waitlisted" : isPending ? "pending" : "registered",
      waitlistPosition: registration.waitlistPosition,
      workshopLines,
      eventPageUrl,
      successPageUrl,
      contactEmail: process.env.SMTP_FROM_EMAIL ?? "info@biohubnet.ca",
    });

    // Build the .ics attachment so the email itself imports cleanly
    // into Apple Mail / Gmail / Outlook calendar apps via the
    // attachment's native "add to calendar" affordance. UID combines
    // event + registration so re-sends update the existing entry.
    const icsBody = buildIcs({
      uid: `event-${event.id}-reg-${registration.id}@biohubnet.ca`,
      title: event.title,
      description: event.tagline ?? event.description ?? null,
      location: isOnline
        ? event.mainVenueName ?? "Online"
        : [event.mainVenueName, event.mainVenueAddress].filter(Boolean).join(", ") || null,
      start: event.startDate,
      end: event.endDate,
      url: eventPageUrl,
      organizerEmail: process.env.SMTP_FROM_EMAIL ?? "info@biohubnet.ca",
      organizerName: "BioHubNet",
      attendeeEmail: recipientEmail,
      attendeeName: recipientName ?? undefined,
    });

    try {
      await sendMail({
        to: recipientEmail,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `${event.slug}.ics`,
            content: icsBody,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
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
    waitlisted: isWaitlisted,
    waitlistPosition: registration.waitlistPosition,
    registration: {
      id: registration.id,
      qrToken: registration.qrToken,
      registrationStatus: registration.registrationStatus,
      waitlistPosition: registration.waitlistPosition,
    },
    workshops: workshopOutcomes.map((o) => ({
      workshopId: o.workshopId,
      title: titleById.get(o.workshopId) ?? null,
      status: o.status,
      waitlistPosition: o.waitlistPosition,
    })),
  });
}

