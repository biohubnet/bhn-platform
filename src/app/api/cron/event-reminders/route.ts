/**
 * Vercel Cron — timed event-reminder dispatcher.
 *
 *   GET /api/cron/event-reminders
 *     Fires every 15 minutes per vercel.json. Iterates published
 *     events whose startDate is in the future, computes the three
 *     reminder windows (1 week / 1 day / 1 hour before), and sends
 *     the appropriate template to every active registrant for any
 *     window that has just passed and hasn't been recorded yet.
 *
 *   Idempotency is by the unique (eventId, kind) constraint on
 *   EventReminder — once the row exists, the kind is "claimed" and
 *   subsequent runs skip it.
 *
 *   Security: Vercel injects the cron-secret as
 *   `Authorization: Bearer ${CRON_SECRET}` header. The endpoint
 *   rejects requests without it so it can't be hit from outside.
 *   Local dev can set `process.env.CRON_SECRET=""` to disable the
 *   gate (or call with the same secret).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";
import {
  renderEventReminder,
  type ReminderKind,
} from "@/lib/email/templates/event-reminder";
import { sendSms, smsConfigured } from "@/lib/sms";
import { renderReminderSms } from "@/lib/sms/templates";

export const runtime = "nodejs";
// Force dynamic — cron requests must not be cached.
export const dynamic = "force-dynamic";

const WINDOW_MS = {
  one_week: 7 * 24 * 60 * 60 * 1000,
  one_day:  1 * 24 * 60 * 60 * 1000,
  one_hour: 1 * 60 * 60 * 1000,
} as const satisfies Record<ReminderKind, number>;

// Tolerance — a reminder fires if the now-cursor crossed its trigger
// time within this window.
//
// On Vercel Hobby the cron runs once per day, so the window has to
// span 24 h + a buffer to catch every event the daily run is
// responsible for. On Pro (where we'd flip vercel.json to `*/15 * *
// * *`) a 30-minute window would be tighter and more correct, but the
// (eventId, kind) unique constraint makes double-sends impossible
// regardless of the window size, so erring wide is safe.
//
// Practical impact on Hobby:
//   • one_week reminders fire within ~24 h of the 7-day mark
//   • one_day  reminders fire within ~24 h of the 1-day mark
//   • one_hour reminders are effectively NEVER timely on Hobby — the
//     trigger time is missed by the time the next daily poll runs.
//     For accurate one-hour reminders, upgrade Vercel to Pro and set
//     the cron back to */15 * * * * in vercel.json.
const FIRE_TOLERANCE_MS = 25 * 60 * 60 * 1000;

export async function GET(req: Request) {
  // Auth gate. Vercel cron uses Bearer CRON_SECRET; CRON_SECRET=""
  // (empty string) disables the gate for local dev.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!mailConfigured()) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "SMTP not configured" },
      { status: 200 },
    );
  }

  const now = new Date();
  const lookAheadMs = WINDOW_MS.one_week + FIRE_TOLERANCE_MS;

  // Pull every published event whose startDate is between now and
  // ~7 days from now (the furthest reminder window).
  const events = await prisma.bhnEvent.findMany({
    where: {
      status: "published",
      startDate: {
        gte: new Date(now.getTime() - FIRE_TOLERANCE_MS),
        lte: new Date(now.getTime() + lookAheadMs),
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      description: true,
      startDate: true,
      endDate: true,
      timezone: true,
      mainVenueName: true,
      mainVenueAddress: true,
      mainVenueMapUrl: true,
      reminders: { select: { kind: true } },
    },
  });

  const proto = process.env.VERCEL_URL ? "https" : "http";
  const host  = process.env.VERCEL_URL ?? process.env.HOST ?? "localhost:3000";
  const contactEmail = process.env.SMTP_FROM_EMAIL ?? "info@biohubnet.ca";

  const report: Array<{
    eventId: string;
    eventSlug: string;
    kind: ReminderKind;
    sent: number;
    skipped: number;
  }> = [];

  for (const event of events) {
    const sentKinds = new Set(event.reminders.map((r) => r.kind));
    const isOnline =
      event.mainVenueName === "Online" ||
      (!!event.mainVenueMapUrl && !event.mainVenueAddress);

    for (const kind of ["one_week", "one_day", "one_hour"] as const) {
      if (sentKinds.has(kind)) continue;
      const triggerAt = new Date(event.startDate.getTime() - WINDOW_MS[kind]);
      // Fire if the trigger time is within (now - tolerance, now]
      // — i.e. we just crossed it.
      if (triggerAt > now) continue;
      if (now.getTime() - triggerAt.getTime() > FIRE_TOLERANCE_MS) {
        // Past the tolerance window — claim the kind without sending
        // so future runs don't re-fire late.
        await prisma.eventReminder.upsert({
          where: { eventId_kind: { eventId: event.id, kind } },
          create: {
            eventId: event.id,
            kind,
            scheduledAt: triggerAt,
            sentAt: now,
            sentCount: 0,
          },
          update: {},
        });
        continue;
      }

      // Find every active registrant — confirmed + pending +
      // waitlisted (waitlisted folks still benefit from "the event
      // is tomorrow" since they might convert if a seat opens
      // last-minute).
      const registrations = await prisma.registration.findMany({
        where: {
          eventId: event.id,
          registrationStatus: { in: ["confirmed", "pending", "waitlist"] },
        },
        select: {
          qrToken: true,
          userId: true,
          guestEmail: true,
          guestName: true,
          guestPhone: true,
          smsOptIn: true,
          user: { select: { email: true, name: true, phone: true } },
        },
      });

      const eventPageUrl = `${proto}://${host}/events/${event.slug}`;

      let sent = 0;
      let skipped = 0;
      for (const r of registrations) {
        const to    = r.user?.email ?? r.guestEmail;
        const name  = r.user?.name  ?? r.guestName  ?? null;
        if (!to) { skipped++; continue; }
        const successPageUrl = `${proto}://${host}/events/${event.slug}/register/success?token=${encodeURIComponent(r.qrToken)}`;
        const { subject, text, html } = renderEventReminder({
          kind,
          recipientName: name,
          recipientEmail: to,
          eventTitle: event.title,
          eventStart: event.startDate,
          eventEnd: event.endDate,
          eventTimezone: event.timezone,
          venueName: event.mainVenueName,
          venueAddress: event.mainVenueAddress,
          meetingUrl: event.mainVenueMapUrl,
          isOnline,
          qrToken: r.qrToken,
          eventPageUrl,
          successPageUrl,
          contactEmail,
        });
        try {
          await sendMail({ to, subject, text, html });
          sent++;
        } catch (err) {
          console.error("Reminder send failed:", to, (err as Error).message);
          skipped++;
        }

        // SMS fan-out — only for the day-of + hour-of reminders, only
        // when Twilio is configured AND the registrant explicitly
        // opted in AND a phone is on file. Costs are small ($0.0075
        // per send) so failures don't gate the cron — just log.
        if ((kind === "one_day" || kind === "one_hour") && smsConfigured() && r.smsOptIn) {
          const phone = r.user?.phone ?? r.guestPhone ?? null;
          if (phone) {
            // Quick "starts in 60 min" / "tomorrow at 7 PM" summary.
            const whenSummary = kind === "one_hour"
              ? "starting in about an hour"
              : `tomorrow at ${event.startDate.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: event.timezone })}`;
            const venueOrMeeting = isOnline
              ? (event.mainVenueMapUrl ?? event.mainVenueName ?? "Online")
              : (event.mainVenueName ?? null);
            const shortLink = successPageUrl;
            const body = renderReminderSms({
              kind,
              eventTitle: event.title,
              whenSummary,
              venueOrMeeting,
              shortLink,
            });
            try {
              await sendSms({ to: phone, body });
            } catch (err) {
              console.error("Reminder SMS failed:", phone, (err as Error).message);
            }
          }
        }
      }

      // Mark sent — even if some sends failed, the kind is claimed
      // so we don't re-blast everyone. Ops should triage from logs.
      await prisma.eventReminder.upsert({
        where: { eventId_kind: { eventId: event.id, kind } },
        create: {
          eventId: event.id,
          kind,
          scheduledAt: triggerAt,
          sentAt: now,
          sentCount: sent,
        },
        update: { sentAt: now, sentCount: sent },
      });

      report.push({ eventId: event.id, eventSlug: event.slug, kind, sent, skipped });
    }
  }

  return NextResponse.json({ ok: true, ran: now.toISOString(), dispatched: report });
}
