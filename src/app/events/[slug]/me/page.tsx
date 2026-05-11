import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode-svg";
import {
  ArrowLeft, Calendar, MapPin, Ticket, ListChecks, ArrowRight, Clock, CheckCircle2,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_WORKSHOPS_PER_USER } from "@/lib/events/constants";
import { BreakoutPicker } from "@/components/events/BreakoutPicker";

/**
 * /events/[slug]/me — attendee dashboard.
 *
 * Surfaces:
 *   • Compact QR pass (with link to full-screen success page).
 *   • Your workshops — current bookings with status badges. Cap
 *     counter (N / MAX_WORKSHOPS_PER_USER) is visible. CTA to
 *     /me/workshops to browse + book more.
 *   • Breakout picker — one card per breakoutGroupId, shows
 *     concurrent sessions, current pick highlighted.
 *   • Quick links — back to public event page, full check-in pass.
 *
 * Anyone not signed in → /login with callback. Signed in but not
 * registered for THIS event → /register (the natural entry point
 * for getting onto the dashboard).
 */
export default async function MyEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/me`)}`);
  }
  const userId = (session.user as { id?: string }).id ?? null;
  const userName = (session.user as { name?: string }).name ?? null;
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/me`)}`);
  }

  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      startDate: true,
      endDate: true,
      mainVenueName: true,
      timezone: true,
      status: true,
    },
  });
  if (!event || event.status !== "published") notFound();

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
    select: {
      qrToken: true,
      attendeeType: true,
      includesSymposiumDay: true,
      checkedInAt: true,
    },
  });
  if (!registration) {
    redirect(`/events/${slug}/register`);
  }

  // The user's active bookings with workshop details.
  const myBookings = await prisma.workshopBooking.findMany({
    where: {
      userId,
      status: { not: "cancelled" },
      workshop: { eventId: event.id },
    },
    include: {
      workshop: {
        select: {
          id: true,
          title: true,
          partnerOrganization: true,
          startDateTime: true,
          endDateTime: true,
          locationName: true,
          kind: true,
        },
      },
    },
    orderBy: { workshop: { startDateTime: "asc" } },
  });

  // Breakout groups + their sessions, plus the user's existing picks.
  const breakoutSessions = registration.includesSymposiumDay
    ? await prisma.symposiumSession.findMany({
        where: { eventId: event.id, breakoutGroupId: { not: null } },
        orderBy: [{ breakoutGroupId: "asc" }, { displayOrder: "asc" }],
        include: {
          speakers: {
            orderBy: { order: "asc" },
            include: { speaker: { select: { fullName: true } } },
          },
        },
      })
    : [];

  const myAgendaIds = breakoutSessions.length === 0
    ? new Set<string>()
    : new Set(
        (
          await prisma.personalAgendaEntry.findMany({
            where: {
              userId,
              symposiumSessionId: { in: breakoutSessions.map((s) => s.id) },
            },
            select: { symposiumSessionId: true },
          })
        ).map((r) => r.symposiumSessionId),
      );

  // Group breakout sessions by their breakoutGroupId.
  const breakoutGroups = new Map<string, typeof breakoutSessions>();
  for (const s of breakoutSessions) {
    if (!s.breakoutGroupId) continue;
    const list = breakoutGroups.get(s.breakoutGroupId) ?? [];
    list.push(s);
    breakoutGroups.set(s.breakoutGroupId, list);
  }

  // Compact QR for the dashboard. Smaller than the success page;
  // attendees who need full size click through to the pass.
  const qrSvg = new QRCode({
    content: registration.qrToken,
    width: 140,
    height: 140,
    padding: 0,
    color: "#0b1b3b",
    background: "#ffffff",
    ecl: "M",
  }).svg();

  const firstName = userName ? userName.split(/\s+/)[0] : "";
  const activeCount = myBookings.length;
  const atCap = activeCount >= MAX_WORKSHOPS_PER_USER;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <Link
        href={`/events/${slug}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> {event.title}
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Your event dashboard
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1">
          {firstName ? `Hi ${firstName}.` : "Welcome back."}
        </h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {registration.checkedInAt
            ? `Checked in ${registration.checkedInAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: event.timezone })}.`
            : `Registered as ${registration.attendeeType}.`}{" "}
          {formatRange(event.startDate, event.endDate, event.timezone)}
          {event.mainVenueName && <> · {event.mainVenueName}</>}
        </p>
      </header>

      {/* QR pass — compact */}
      <section className="rounded-2xl border border-line bg-card surface-shadow p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <div
          className="w-[140px] h-[140px] rounded-lg overflow-hidden bg-white p-2 shrink-0"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
          aria-label="Check-in QR code"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Check-in pass
          </p>
          <p className="text-sm text-fg leading-relaxed mt-2">
            Show this QR at the door. The fallback code is{" "}
            <span className="font-mono text-[11px] text-subtle break-all">
              {registration.qrToken}
            </span>
            .
          </p>
          <Link
            href={`/events/${slug}/register/success`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 mt-3 hover:underline"
          >
            Open full-screen pass <ArrowRight size={11} />
          </Link>
        </div>
      </section>

      {/* Workshops */}
      <section className="rounded-2xl border border-line bg-card surface-shadow p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
          <h2 className="text-base font-bold text-fg tracking-tight inline-flex items-center gap-2">
            <ListChecks size={14} className="text-brand-600" />
            Your workshops
          </h2>
          <span className="text-xs font-mono tabular-nums text-subtle">
            {activeCount} / {MAX_WORKSHOPS_PER_USER}
          </span>
          <span className="ml-auto">
            <Link
              href={`/events/${slug}/me/workshops`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              {atCap ? "Browse all workshops" : "Browse & book →"}
            </Link>
          </span>
        </div>

        {myBookings.length === 0 ? (
          <div className="rounded-xl bg-elevated p-5 text-center">
            <p className="text-sm text-muted">
              You haven't booked any workshops yet. Pick up to {MAX_WORKSHOPS_PER_USER}{" "}
              across Training Week.
            </p>
            <Link
              href={`/events/${slug}/me/workshops`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors"
            >
              Browse workshops <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {myBookings.map((b) => {
              const isConfirmed = b.status === "confirmed";
              return (
                <li
                  key={b.id}
                  className="flex items-start gap-3 rounded-xl bg-elevated p-3 border border-line"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isConfirmed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isConfirmed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg leading-tight">
                      {b.workshop.title}
                    </p>
                    <p className="text-[11px] text-muted leading-snug mt-0.5">
                      {b.workshop.partnerOrganization ? `${b.workshop.partnerOrganization} · ` : ""}
                      {formatWorkshopTime(b.workshop.startDateTime, b.workshop.endDateTime, event.timezone)}
                      {b.workshop.locationName ? ` · ${b.workshop.locationName}` : ""}
                    </p>
                    <p className="text-[11px] font-bold mt-1.5 inline-flex items-center gap-1">
                      {isConfirmed ? (
                        <span className="text-emerald-700">Confirmed</span>
                      ) : (
                        <span className="text-amber-800">
                          Waitlist {b.waitlistPosition !== null && `#${b.waitlistPosition}`}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Breakouts */}
      {registration.includesSymposiumDay && breakoutGroups.size > 0 && (
        <section className="rounded-2xl border border-line bg-card surface-shadow p-5 sm:p-6">
          <h2 className="text-base font-bold text-fg tracking-tight mb-1">
            Pick your afternoon breakout
          </h2>
          <p className="text-xs text-muted leading-snug mb-4">
            On the symposium day, two sessions run in parallel. Pick the one
            you want to attend — your pick is saved instantly.
          </p>
          <div className="space-y-4">
            {Array.from(breakoutGroups.entries()).map(([groupId, sessions]) => {
              const pickedId =
                sessions.find((s) => myAgendaIds.has(s.id))?.id ?? null;
              return (
                <BreakoutPicker
                  key={groupId}
                  slug={slug}
                  groupId={groupId}
                  pickedId={pickedId}
                  sessions={sessions.map((s) => ({
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    room: s.room,
                    speakerNames: s.speakers.map((sp) => sp.speaker.fullName),
                  }))}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="rounded-2xl border border-line bg-card surface-shadow p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          Quick links
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink href={`/events/${slug}`} icon={Calendar} label="Event details" />
          <QuickLink
            href={`/events/${slug}/register/success`}
            icon={Ticket}
            label="Full check-in pass"
          />
          <QuickLink href={`/events/${slug}/me/workshops`} icon={MapPin} label="Browse workshops" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href, icon: Icon, label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5 hover:bg-card hover:border-brand-300 border border-line transition-colors"
    >
      <Icon size={16} className="text-brand-600 shrink-0" />
      <span className="text-sm font-semibold text-fg">{label}</span>
      <ArrowRight size={12} className="ml-auto text-subtle" />
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

function formatWorkshopTime(start: Date, end: Date, timeZone: string): string {
  const day = start.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const t1 = start.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
  const t2 = end.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
  return `${day} · ${t1}–${t2}`;
}
