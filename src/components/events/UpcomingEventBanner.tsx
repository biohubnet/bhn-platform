import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Ticket, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Trainee-facing dashboard banner advertising the next BHN event.
 *
 * Renders nothing when no event qualifies — i.e.:
 *   • There is no published event whose endDate is in the future, OR
 *   • Registration window is set and the close date is in the past.
 *
 * Two CTAs depending on the viewer's relationship to the event:
 *   • Confirmed-registered → "Open my event dashboard" → /events/[slug]/me
 *   • Anyone else (including pending registrations and never-registered)
 *     → "Register" → /events/[slug]/register
 *
 * Visual weight is deliberate: the banner uses the brand gradient and
 * sits near the top of the dashboard. It auto-suppresses once the
 * event ends, so we don't need a "dismiss" affordance.
 */
export async function UpcomingEventBanner({ userId }: { userId: string }) {
  const now = new Date();

  const event = await prisma.bhnEvent.findFirst({
    where: {
      status: "published",
      endDate: { gte: now },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      startDate: true,
      endDate: true,
      timezone: true,
      mainVenueName: true,
      registrationClosesAt: true,
    },
  });
  if (!event) return null;

  // Only suppress when the close date has already passed AND the
  // viewer hasn't registered yet — confirmed registrants still need
  // the link to their /me dashboard regardless of the close window.
  const registrationClosed =
    event.registrationClosesAt !== null && event.registrationClosesAt < now;

  // Check the viewer's registration status for this event in one
  // cheap lookup. Composite unique index means this is a single
  // index hit.
  const myReg = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
    select: { registrationStatus: true },
  });

  const confirmed = myReg?.registrationStatus === "confirmed";

  // Hide when registration's closed AND we're not already in. (A
  // pending registration here is unusual — we treat it the same as
  // "not registered" so the user lands on /register, which is
  // idempotent.)
  if (registrationClosed && !confirmed) return null;

  const ctaHref = confirmed
    ? `/events/${event.slug}/me`
    : `/events/${event.slug}/register`;
  const ctaLabel = confirmed ? "Open my event dashboard" : "Register";
  const Icon = confirmed ? CheckCircle2 : Ticket;

  return (
    <Link
      href={ctaHref}
      className="block relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white px-5 sm:px-6 py-4 hover:from-brand-700 hover:via-brand-800 hover:to-brand-900 transition-colors surface-shadow"
    >
      {/* Decorative drifting blob — matches the dashboard hero. */}
      <div
        aria-hidden
        className="absolute -top-8 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />

      <div className="relative flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-white/80">
            {confirmed ? "You're registered" : "Coming up"}
          </p>
          <p className="text-base sm:text-lg font-bold tracking-tight leading-tight mt-0.5">
            {event.title}
          </p>
          <p className="text-xs text-white/85 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {formatRange(event.startDate, event.endDate, event.timezone)}
            </span>
            {event.mainVenueName && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} />
                {event.mainVenueName}
              </span>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-white text-brand-700 px-4 py-2 rounded-xl hover:bg-brand-50 transition-colors shrink-0">
          {ctaLabel}
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function formatRange(start: Date, end: Date, timeZone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone });
  const startStr = fmt(start);
  const endStr = fmt(end);
  const year = end.toLocaleDateString("en-CA", { year: "numeric", timeZone });
  if (startStr === endStr) return `${startStr}, ${year}`;
  return `${startStr}–${endStr.replace(/^[A-Za-z]+\s+/, "")}, ${year}`;
}
