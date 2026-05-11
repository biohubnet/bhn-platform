import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, MapPin, Users, Bus, ExternalLink, AlertCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_WORKSHOPS_PER_USER } from "@/lib/events/constants";
import { WorkshopBookButton } from "@/components/events/WorkshopBookButton";

/**
 * /events/[slug]/me/workshops — browse + book Training Week
 * workshops.
 *
 * Gate: signed in + has a confirmed Registration for this event.
 * The user's current booking status per workshop is computed in
 * one query against WorkshopBooking; the per-card button uses that
 * to render the right state (Book / Join waitlist / Booked /
 * Waitlist #N / Pick 2 reached).
 *
 * Workshops grouped by day, sorted chronologically within each day.
 */
export default async function BrowseWorkshopsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/me/workshops`)}`);
  }
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/me/workshops`)}`);
  }

  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, timezone: true, status: true },
  });
  if (!event || event.status !== "published") notFound();

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
    select: { registrationStatus: true },
  });
  if (!registration || registration.registrationStatus !== "confirmed") {
    redirect(`/events/${slug}/register`);
  }

  // Workshops + all non-cancelled bookings for this event in two
  // queries. We compute per-workshop counts + the user's own state
  // in JS — scales fine at Phase 1 volumes (single-digit count of
  // workshops × hundreds of attendees).
  const [workshops, allBookings] = await Promise.all([
    prisma.workshop.findMany({
      where: { eventId: event.id, isActive: true },
      orderBy: [{ startDateTime: "asc" }, { displayOrder: "asc" }],
    }),
    prisma.workshopBooking.findMany({
      where: {
        workshop: { eventId: event.id },
        status: { not: "cancelled" },
      },
      select: {
        workshopId: true,
        userId: true,
        status: true,
        waitlistPosition: true,
      },
    }),
  ]);

  // Build the per-workshop lookup.
  const stats = new Map<
    string,
    {
      confirmed: number;
      waitlist: number;
      mine: { status: "confirmed" | "waitlist"; pos: number | null } | null;
    }
  >();
  for (const w of workshops) {
    stats.set(w.id, { confirmed: 0, waitlist: 0, mine: null });
  }
  for (const b of allBookings) {
    const entry = stats.get(b.workshopId);
    if (!entry) continue;
    if (b.status === "confirmed") entry.confirmed++;
    if (b.status === "waitlist") entry.waitlist++;
    if (b.userId === userId) {
      entry.mine = {
        status: b.status as "confirmed" | "waitlist",
        pos: b.waitlistPosition,
      };
    }
  }

  // User's active count (across all workshops in this event).
  const myActiveCount = allBookings.filter((b) => b.userId === userId).length;
  const atCap = myActiveCount >= MAX_WORKSHOPS_PER_USER;

  // Group workshops by day.
  const byDay = new Map<string, { label: string; workshops: typeof workshops }>();
  for (const w of workshops) {
    const dayKey = w.startDateTime.toLocaleDateString("en-CA", {
      timeZone: event.timezone,
    });
    const label = w.startDateTime.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: event.timezone,
    });
    const bucket = byDay.get(dayKey) ?? { label, workshops: [] };
    bucket.workshops.push(w);
    byDay.set(dayKey, bucket);
  }
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <Link
        href={`/events/${slug}/me`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Your dashboard
      </Link>

      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Training Week
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1">
            Workshops &amp; tours
          </h1>
        </div>
        <p className="ml-auto text-sm font-mono tabular-nums text-fg">
          <span
            className={
              atCap
                ? "text-rose-700 font-bold"
                : myActiveCount > 0
                ? "text-brand-700 font-bold"
                : "text-subtle"
            }
          >
            {myActiveCount} / {MAX_WORKSHOPS_PER_USER}
          </span>{" "}
          <span className="text-subtle">picked</span>
        </p>
      </header>

      {atCap && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-snug">
            You've booked the maximum of {MAX_WORKSHOPS_PER_USER} workshops.
            Cancel one from your dashboard to free up a slot.
          </p>
        </div>
      )}

      {days.map(([dayKey, group]) => (
        <section key={dayKey}>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-3">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.workshops.map((w) => {
              const s = stats.get(w.id)!;
              return (
                <article
                  key={w.id}
                  className="rounded-2xl bg-card border border-line p-5 surface-shadow flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
                        {w.kind}
                      </span>
                      {w.partnerOrganization && (
                        <span className="text-[11px] font-semibold text-muted ml-2">
                          {w.partnerOrganization}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-fg tracking-tight leading-tight">
                    {w.title}
                  </h3>

                  {w.shortDescription && (
                    <p className="text-xs text-muted leading-snug">
                      {w.shortDescription}
                    </p>
                  )}

                  <dl className="text-xs text-fg space-y-1.5">
                    <Row icon={Clock}>
                      {formatTimeRange(w.startDateTime, w.endDateTime, event.timezone)}
                    </Row>
                    <Row icon={MapPin}>{w.locationName ?? "TBA"}</Row>
                    <Row icon={Users}>
                      <span
                        className={
                          s.confirmed >= w.capacity
                            ? "text-amber-700 font-bold"
                            : "text-fg"
                        }
                      >
                        {s.confirmed} / {w.capacity}
                      </span>{" "}
                      <span className="text-subtle">spots taken</span>
                      {s.waitlist > 0 && (
                        <span className="text-amber-700 ml-1">
                          · {s.waitlist} on waitlist
                        </span>
                      )}
                    </Row>
                    {w.requiresTransport && (
                      <Row icon={Bus}>
                        Bus from {w.departureLocation ?? "common pickup"}
                      </Row>
                    )}
                  </dl>

                  {w.learnMoreUrl && (
                    <a
                      href={w.learnMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline self-start"
                    >
                      Learn more <ExternalLink size={11} />
                    </a>
                  )}

                  <div className="mt-auto pt-2">
                    <WorkshopBookButton
                      slug={slug}
                      workshopId={w.id}
                      myStatus={s.mine?.status ?? null}
                      myWaitlistPosition={s.mine?.pos ?? null}
                      confirmedCount={s.confirmed}
                      capacity={w.capacity}
                      atCap={atCap}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-fg leading-snug">
      <Icon size={12} className="text-subtle shrink-0 mt-0.5" />
      <span>{children}</span>
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
  return `${formatDay(start, timeZone)} – ${formatDay(end, timeZone)}`;
}

function formatDay(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
}
