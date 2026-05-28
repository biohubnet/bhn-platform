import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode-svg";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Ticket,
  ListChecks,
  Coffee,
  ArrowRight,
  Hourglass,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintLink } from "@/components/events/PrintLink";

/**
 * Post-registration confirmation page.
 *
 * Dual access path (Dec '26):
 *   • Signed-in users — looked up by (eventId, userId).
 *   • Guests — looked up by qrToken passed on the URL: `?token=...`.
 *     The link is also embedded in the confirmation email so guests
 *     can return here later. No auth bounce on this page anymore.
 *
 * Shows the attendee:
 *   • A check-in QR (server-rendered SVG using qrcode-svg). The
 *     payload is the qrToken from the Registration row — admins
 *     scan it at the door to mark checkedInAt.
 *   • The token in plain text as a fallback.
 *   • Event details (dates, venue, what they registered for).
 *   • "Next steps" cards (signed-in only — guest path skips these).
 */
export default async function RegistrationSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  const session = await getSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const userName = (session?.user as { name?: string } | undefined)?.name ?? null;

  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      startDate: true,
      endDate: true,
      mainVenueName: true,
      mainVenueAddress: true,
      mainVenueMapUrl: true,
      timezone: true,
    },
  });
  if (!event) notFound();

  // Resolve the registration. Token wins when provided (guest access);
  // otherwise fall back to the signed-in user's registration. If
  // neither path resolves, 404.
  const registration = token
    ? await prisma.registration.findFirst({
        where: { eventId: event.id, qrToken: token },
        select: {
          qrToken: true,
          attendeeType: true,
          includesSymposiumDay: true,
          registrationStatus: true,
          waitlistPosition: true,
          dietaryRestrictions: true,
          accessibilityNeeds: true,
          guestName: true,
          guestEmail: true,
          userId: true,
          createdAt: true,
        },
      })
    : userId
      ? await prisma.registration.findUnique({
          where: { eventId_userId: { eventId: event.id, userId } },
          select: {
            qrToken: true,
            attendeeType: true,
            includesSymposiumDay: true,
            registrationStatus: true,
            waitlistPosition: true,
            dietaryRestrictions: true,
            accessibilityNeeds: true,
            guestName: true,
            guestEmail: true,
            userId: true,
            createdAt: true,
          },
        })
      : null;
  if (!registration) notFound();
  const isWaitlisted = registration.registrationStatus === "waitlist";

  // Workshop bookings only apply to signed-in users registered via
  // the rich form (guest path can't book workshops).
  const isGuestReg = registration.userId === null;
  const workshopBookings = isGuestReg
    ? []
    : await prisma.workshopBooking.findMany({
        where: {
          userId: registration.userId!,
          workshop: { eventId: event.id },
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          status: true,
          waitlistPosition: true,
          workshop: { select: { title: true, kind: true } },
        },
        orderBy: { bookedAt: "asc" },
      });
  const isRegistrationPending = registration.registrationStatus === "pending";
  const anyPendingBooking = workshopBookings.some((b) => b.status === "pending");
  // The "we got it, but it's not a confirmed seat yet" banner. Covers
  // pending approval, pending workshop bookings, AND waitlist rows.
  const showApprovalBanner = isRegistrationPending || anyPendingBooking || isWaitlisted;

  // Server-rendered QR. qrcode-svg returns a plain string we inject
  // via dangerouslySetInnerHTML on a wrapper div — there's no XSS
  // surface here because the qrToken is hex from randomBytes.
  const qrSvg = new QRCode({
    content: registration.qrToken,
    width: 220,
    height: 220,
    padding: 0,
    color: "#0b1b3b",
    background: "#ffffff",
    ecl: "M",
  }).svg();

  // First-name resolution: prefer session name for signed-in, fall
  // back to guestName for guest registrations.
  const displayName = userName ?? registration.guestName ?? "";
  const firstName = displayName ? displayName.split(/\s+/)[0] : "";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 print:py-6 print:max-w-full">
      {/* Confirmation header */}
      <div className="text-center mb-10 print:mb-6">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 print:hidden ${
            showApprovalBanner
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {showApprovalBanner ? <Hourglass size={28} /> : <CheckCircle2 size={28} />}
        </div>
        <p
          className={`text-[10px] uppercase tracking-[0.22em] font-bold print:hidden ${
            showApprovalBanner ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {isWaitlisted
            ? `Waitlisted — position #${registration.waitlistPosition ?? "?"}`
            : showApprovalBanner
              ? "Submitted — pending approval"
              : "You're registered"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1.5">
          {isWaitlisted
            ? firstName
              ? `You're on the waitlist, ${firstName}.`
              : "You're on the waitlist."
            : showApprovalBanner
              ? firstName
                ? `Thanks for registering, ${firstName}.`
                : "Thanks for registering."
              : firstName
                ? `See you in ${event.mainVenueName ?? "Toronto"}, ${firstName}.`
                : "You're in."}
        </h1>
        <p className="text-sm text-muted mt-3 leading-relaxed max-w-md mx-auto">
          {isWaitlisted ? (
            <>
              The event is currently full. We'll email you the moment a seat
              opens — usually when someone cancels. Your position{" "}
              <span className="font-bold">won't change</span> until then.
            </>
          ) : showApprovalBanner ? (
            <>
              Your request is in the admin queue. We'll email you within 1–2
              business days once it's approved — your spot is{" "}
              <span className="font-bold">not guaranteed</span> until then.
              Save this page in the meantime.
            </>
          ) : (
            <>
              A confirmation email is on its way. Save this page or the email —
              you'll need the QR for check-in.
            </>
          )}
        </p>
      </div>

      {/* Pending bookings detail strip — when at least one workshop
          booking is awaiting approval, surface the list explicitly so
          attendees know which slots they asked for. */}
      {workshopBookings.length > 0 && (
        <section className="rounded-2xl bg-card border border-line p-5 mb-6 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3 inline-flex items-center gap-1.5">
            <ListChecks size={11} /> Your tour / workshop picks
          </p>
          <ul className="space-y-2">
            {workshopBookings.map((b) => {
              const tint =
                b.status === "pending"
                  ? "bg-violet-100 text-violet-800 ring-violet-200"
                  : b.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                    : "bg-amber-100 text-amber-800 ring-amber-200";
              const label =
                b.status === "pending"
                  ? "Pending approval"
                  : b.status === "waitlist" && b.waitlistPosition !== null
                    ? `Waitlist #${b.waitlistPosition}`
                    : "Confirmed";
              return (
                <li key={b.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mr-1.5">
                      {b.workshop.kind}
                    </span>
                    <span className="text-fg font-semibold">{b.workshop.title}</span>
                  </span>
                  <span
                    className={`shrink-0 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tint}`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cross-prompt: registered for symposium but didn't pick any
          tour/workshop. Signed-in users only — guests can't book
          workshops (those require a User row). */}
      {!isGuestReg && workshopBookings.length === 0 && registration.includesSymposiumDay && (
        <Link
          href={`/events/${slug}/me/workshops`}
          className="block rounded-2xl bg-brand-50 ring-1 ring-inset ring-brand-200 p-5 mb-6 print:hidden hover:bg-brand-100 transition-colors group"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-700">
            Add a tour or workshop
          </p>
          <p className="text-sm font-bold text-fg mt-1">
            You haven't picked a Training Week tour or workshop yet
            <ArrowRight size={14} className="inline-block ml-1 text-brand-700 group-hover:translate-x-0.5 transition-transform" />
          </p>
          <p className="text-xs text-muted mt-1.5 leading-snug">
            Tours and workshops have separate 20-seat caps and require
            admin approval. Pick early — the popular ones fill quickly.
          </p>
        </Link>
      )}

      {/* QR + check-in token */}
      <section className="rounded-2xl bg-card border border-line surface-shadow p-6 sm:p-8 mb-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3 inline-flex items-center gap-1.5">
          <Ticket size={11} /> Your check-in pass
        </p>
        <div
          className="w-[220px] h-[220px] mx-auto rounded-lg overflow-hidden bg-white p-2"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
          aria-label="Check-in QR code"
        />
        <p className="text-[11px] font-mono text-subtle mt-3 break-all max-w-xs mx-auto">
          {registration.qrToken}
        </p>
        <p className="text-xs text-muted mt-2 max-w-md mx-auto leading-snug">
          Admins scan this at the door. The code above is the fallback for
          when a phone camera can't read the QR — read it aloud to the
          check-in desk.
        </p>
      </section>

      {/* Event recap */}
      <section className="rounded-2xl bg-card border border-line surface-shadow p-5 sm:p-6 mb-6">
        <h2 className="text-base font-bold text-fg tracking-tight mb-4">
          {event.title}
        </h2>
        <dl className="space-y-3 text-sm">
          <Row icon={Calendar} label="When">
            {formatRange(event.startDate, event.endDate, event.timezone)}
          </Row>
          {event.mainVenueName && (
            <Row icon={MapPin} label="Where">
              <span className="block text-fg">{event.mainVenueName}</span>
              {event.mainVenueAddress && (
                <span className="block text-muted text-xs mt-0.5 font-mono">
                  {event.mainVenueAddress}
                </span>
              )}
              {event.mainVenueMapUrl && (
                <a
                  href={event.mainVenueMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-brand-700 mt-1 hover:underline print:hidden"
                >
                  Open in maps →
                </a>
              )}
            </Row>
          )}
          <Row icon={Ticket} label="Attendee type">
            <span className="capitalize">{registration.attendeeType}</span>
            {!registration.includesSymposiumDay && (
              <span className="text-[11px] text-muted ml-2">
                — Training Week only (skipping symposium day)
              </span>
            )}
          </Row>
          {registration.dietaryRestrictions && (
            <Row icon={Coffee} label="Dietary">
              {registration.dietaryRestrictions}
            </Row>
          )}
          {registration.accessibilityNeeds && (
            <Row icon={ListChecks} label="Accessibility">
              {registration.accessibilityNeeds}
            </Row>
          )}
        </dl>
      </section>

      {/* Next steps — signed-in users only. Guest registrations can't
          book workshops or pick breakouts (those require a User row),
          so we skip the section entirely rather than showing affordances
          they can't use. */}
      {!isGuestReg && (
        <section className="rounded-2xl border border-line bg-card surface-shadow p-5 sm:p-6 mb-6 print:hidden">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
            What's next
          </p>
          <ul className="space-y-3">
            <NextStep
              icon={ListChecks}
              title="Pick your workshops"
              body="Choose up to 2 from the Training Week. Some have small caps; the popular ones fill quickly."
              href={`/events/${slug}/me/workshops`}
              comingSoon
            />
            {registration.includesSymposiumDay && (
              <NextStep
                icon={Calendar}
                title="Choose your afternoon breakout"
                body="Two breakouts run in parallel on the symposium day; pick the one you want."
                href={`/events/${slug}/me`}
                comingSoon
              />
            )}
          </ul>
          <p className="text-[11px] text-muted mt-4 leading-snug">
            Workshop selection opens soon. We'll email you the moment it goes live.
          </p>
        </section>
      )}

      {/* Footer links */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm print:hidden">
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center gap-2 text-muted hover:text-fg transition-colors"
        >
          <ArrowRight size={14} className="rotate-180" />
          Back to event page
        </Link>
        <PrintLink />
      </div>
    </div>
  );
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-elevated text-subtle flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
          {label}
        </dt>
        <dd className="text-sm text-fg mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  body,
  href,
  comingSoon = false,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  href: string;
  comingSoon?: boolean;
}) {
  const className = comingSoon
    ? "rounded-xl border border-line bg-elevated p-4 flex items-start gap-3 opacity-70 cursor-not-allowed"
    : "rounded-xl border border-line bg-elevated p-4 flex items-start gap-3 hover:bg-card transition-colors cursor-pointer";
  const Inner = (
    <>
      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold text-fg">{title}</p>
          {comingSoon && (
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted leading-snug mt-0.5">{body}</p>
      </div>
      {!comingSoon && <ArrowRight size={14} className="text-subtle shrink-0 mt-2" />}
    </>
  );
  return comingSoon ? (
    <li className={className}>{Inner}</li>
  ) : (
    <li>
      <Link href={href} className={className}>
        {Inner}
      </Link>
    </li>
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
