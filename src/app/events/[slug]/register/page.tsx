import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationForm, type WorkshopOption } from "@/components/events/RegistrationForm";

/**
 * /events/[slug]/register — auth-gated registration form for the
 * symposium.
 *
 * Behaviour
 *   • Anonymous visitor → bounce to /login with a callbackUrl that
 *     returns here after sign-in. The landing-page "Register" CTA
 *     already wires this path; we re-check server-side so a direct
 *     deep-link can't bypass.
 *   • Event must be published. Slug mismatch → 404 page.
 *   • Already registered? Redirect to /register/success — same
 *     destination as a fresh submission. No duplicate form
 *     submissions, no confusing "you have a registration" banner;
 *     they just see the confirmation.
 *   • Outside registration window? Render a friendly "not open yet"
 *     or "closed" panel instead of the form.
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}`);
  }
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}`);
  }

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
      timezone: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
    },
  });
  if (!event || event.status !== "published") notFound();

  // Already registered? Bounce to success.
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
    select: { id: true },
  });
  if (existing) {
    redirect(`/events/${slug}/register/success`);
  }

  // Registration window.
  const now = new Date();
  const notYetOpen =
    event.registrationOpensAt !== null && event.registrationOpensAt > now;
  const closed =
    event.registrationClosesAt !== null && event.registrationClosesAt < now;

  // Workshops + per-workshop confirmed counts. Loaded once SSR-side
  // and threaded into the form so the user can pick during sign-up.
  // We deliberately skip workshops when the registration form is
  // disabled (window not open / closed) — the form isn't rendered
  // then.
  let workshops: WorkshopOption[] = [];
  if (!notYetOpen && !closed) {
    const [activeWorkshops, allBookings] = await Promise.all([
      prisma.workshop.findMany({
        where: { eventId: event.id, isActive: true },
        orderBy: [{ startDateTime: "asc" }, { displayOrder: "asc" }],
        select: {
          id: true,
          title: true,
          shortDescription: true,
          kind: true,
          partnerOrganization: true,
          startDateTime: true,
          endDateTime: true,
          locationName: true,
          capacity: true,
          requiresTransport: true,
        },
      }),
      prisma.workshopBooking.groupBy({
        by: ["workshopId", "status"],
        where: {
          workshop: { eventId: event.id },
          status: { not: "cancelled" },
        },
        _count: { _all: true },
      }),
    ]);
    const countLookup = new Map<string, { confirmed: number; waitlist: number }>();
    for (const w of activeWorkshops) countLookup.set(w.id, { confirmed: 0, waitlist: 0 });
    for (const row of allBookings) {
      const entry = countLookup.get(row.workshopId);
      if (!entry) continue;
      if (row.status === "confirmed") entry.confirmed = row._count._all;
      else if (row.status === "waitlist") entry.waitlist = row._count._all;
    }

    workshops = activeWorkshops.map((w) => {
      const c = countLookup.get(w.id) ?? { confirmed: 0, waitlist: 0 };
      const dayKey = w.startDateTime.toLocaleDateString("en-CA", { timeZone: event.timezone });
      const dayLabel = w.startDateTime.toLocaleDateString("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: event.timezone,
      });
      return {
        id: w.id,
        title: w.title,
        shortDescription: w.shortDescription,
        kind: w.kind,
        partnerOrganization: w.partnerOrganization,
        locationName: w.locationName,
        requiresTransport: w.requiresTransport,
        capacity: w.capacity,
        confirmedCount: c.confirmed,
        waitlistCount: c.waitlist,
        timeLabel: formatTimeRange(w.startDateTime, w.endDateTime, event.timezone),
        dayKey,
        dayLabel,
      };
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Link
        href={`/events/${slug}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-6"
      >
        <ArrowLeft size={12} /> Back to event page
      </Link>

      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Register
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1">
          {event.title}
        </h1>
        {event.tagline && (
          <p className="text-sm text-muted mt-2 leading-relaxed">{event.tagline}</p>
        )}
        <p className="text-sm text-fg font-semibold mt-3">
          {formatDates(event.startDate, event.endDate, event.timezone)}
          {event.mainVenueName && <span className="text-muted"> · {event.mainVenueName}</span>}
        </p>
      </div>

      {notYetOpen ? (
        <WindowPanel
          icon={Clock}
          title="Registration hasn't opened yet"
          body={
            <>
              Registration opens on{" "}
              <span className="font-semibold text-fg">
                {event.registrationOpensAt!.toLocaleString("en-CA", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: event.timezone,
                })}
              </span>
              . Bookmark this page and come back then.
            </>
          }
        />
      ) : closed ? (
        <WindowPanel
          icon={AlertCircle}
          title="Registration is closed"
          tone="rose"
          body={
            <>
              The window closed on{" "}
              <span className="font-semibold text-fg">
                {event.registrationClosesAt!.toLocaleDateString("en-CA", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: event.timezone,
                })}
              </span>
              . If you think this is wrong or you need a late add, contact{" "}
              <a
                href="mailto:support@biohubnet.ca"
                className="text-brand-700 font-semibold hover:underline"
              >
                support@biohubnet.ca
              </a>
              .
            </>
          }
        />
      ) : (
        <RegistrationForm slug={slug} workshops={workshops} />
      )}
    </div>
  );
}

function WindowPanel({
  icon: Icon,
  title,
  body,
  tone = "amber",
}: {
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
  tone?: "amber" | "rose";
}) {
  const styles =
    tone === "rose"
      ? "bg-rose-50 ring-rose-200 text-rose-900"
      : "bg-amber-50 ring-amber-200 text-amber-900";
  return (
    <div className={`rounded-2xl ring-1 ring-inset p-5 sm:p-6 flex items-start gap-3 ${styles}`}>
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold tracking-tight">{title}</p>
        <p className="text-sm leading-relaxed mt-2">{body}</p>
      </div>
    </div>
  );
}

function formatTimeRange(start: Date, end: Date, timeZone: string): string {
  const sameDay =
    start.toLocaleDateString("en-CA", { timeZone }) ===
    end.toLocaleDateString("en-CA", { timeZone });
  const t = (d: Date) =>
    d.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  if (sameDay) return `${t(start)}–${t(end)}`;
  return `${start.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone })} – ${end.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone })}`;
}

function formatDates(start: Date, end: Date, timeZone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone });
  const startStr = fmt(start);
  const endStr = fmt(end);
  const year = end.toLocaleDateString("en-CA", { year: "numeric", timeZone });
  if (startStr === endStr) return `${startStr}, ${year}`;
  return `${startStr}–${endStr.replace(/^[A-Za-z]+\s+/, "")}, ${year}`;
}
