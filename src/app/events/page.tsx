import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Users, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { EventCalendar, type EventDot } from "@/components/events/EventCalendar";
import { DemoEventsControls } from "@/components/events/DemoEventsControls";
import { EditableText } from "@/components/cms/EditableText";
import { getCopyMap } from "@/lib/copy";

/**
 * /events — public landing for all currently-published BHN events.
 *
 * Sits OUTSIDE the (dashboard) group so anonymous visitors can find
 * what's coming up from biohubnet.ca / LinkedIn / email. Same chrome
 * as /events/[slug] (handled by src/app/events/layout.tsx).
 *
 * Today this is usually a one-row list (one upcoming Symposium /
 * Training Week per year) — but the list-first design means adding
 * a second edition or a one-off workshop series in the future doesn't
 * require touching this page.
 *
 * Order: upcoming first (earliest startDate), then past (most recent
 * first). Drafts and archived events are hidden — admins reach them
 * via /admin/events instead.
 */
export const dynamic = "force-dynamic";

export default async function EventsIndexPage() {
  const now = new Date();
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const isStaff = role ? checkIsStaff(role) : false;

  // Two queries kept separate so we can render the "upcoming" and
  // "past" sections with distinct headers + visual weight, instead
  // of one mixed list that's harder to scan.
  const [upcoming, past] = await Promise.all([
    prisma.bhnEvent.findMany({
      where: { status: "published", endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      select: {
        id: true, slug: true, title: true, tagline: true,
        startDate: true, endDate: true, timezone: true,
        mainVenueName: true,
        _count: { select: { registrations: true } },
      },
    }),
    prisma.bhnEvent.findMany({
      where: { status: "published", endDate: { lt: now } },
      orderBy: { startDate: "desc" },
      take: 6,
      select: {
        id: true, slug: true, title: true, tagline: true,
        startDate: true, endDate: true, timezone: true,
        mainVenueName: true,
      },
    }),
  ]);

  const titleDefault = "Symposium, Training Week & more";
  const introDefault = "The BioHubNet Annual Symposium + Training Week is the flagship gathering for biomanufacturing trainees, faculty, and industry partners across Canada. Browse upcoming editions below and register from the event page.";
  const copy = await getCopyMap(["events.indexHeader.title", "events.indexHeader.intro"]);
  const headerTitle = copy["events.indexHeader.title"] ?? titleDefault;
  const headerIntro = copy["events.indexHeader.intro"] ?? introDefault;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-600">
          BHN Events
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-fg mt-2 tracking-tight">
          <EditableText copyKey="events.indexHeader.title" defaultText={headerTitle} isStaff={isStaff} multiline={false} />
        </h1>
        <p className="text-base text-muted mt-3 max-w-2xl leading-relaxed">
          <EditableText copyKey="events.indexHeader.intro" defaultText={headerIntro} isStaff={isStaff} />
        </p>
      </header>

      {/* Upcoming — split into a calendar view (visual scan of when)
          + a list view (everything else: tagline, venue, registration
          count). Calendar appears first because most visitors are
          scanning "when's the next thing?" not "what's it called?". */}
      <section id="upcoming">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">
            Upcoming
          </h2>
          {isStaff && <DemoEventsControls />}
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
              <Calendar size={20} />
            </div>
            <p className="text-sm font-medium text-muted">No events on the calendar right now.</p>
            <p className="text-xs text-subtle mt-1.5 max-w-md mx-auto leading-relaxed">
              The next edition is usually announced in late spring. Watch
              the BioHubNet newsletter or check back here.
              {isStaff && <> Or seed a few demo events above for testing.</>}
            </p>
          </div>
        ) : (
          // Calendar + list stack vertically. Calendar takes the full
          // page width so it can show three months side-by-side with
          // roomy cells; the list sits below with the per-event
          // metadata that wouldn't fit inside the cells.
          <div className="space-y-6">
            <EventCalendar
              monthsAhead={2}
              events={upcoming.map((e, i): EventDot => ({
                id: e.id,
                slug: e.slug,
                title: e.title,
                start: e.startDate.toISOString(),
                end: e.endDate.toISOString(),
                // First (earliest) upcoming gets the brand emphasis;
                // everything else renders as a neutral band so the
                // calendar doesn't read as one big blob of brand colour.
                tone: i === 0 ? "brand" : "neutral",
              }))}
            />
            <ul className="space-y-4">
              {upcoming.map((e, i) => (
                <li key={e.id}>
                  <EventCard
                    slug={e.slug}
                    title={e.title}
                    tagline={e.tagline}
                    start={e.startDate}
                    end={e.endDate}
                    timezone={e.timezone}
                    venue={e.mainVenueName}
                    registered={e._count.registrations}
                    emphasis={i === 0}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-4">
            Past editions
          </h2>
          <ul className="space-y-3">
            {past.map((e) => (
              <li key={e.id}>
                <EventCard
                  slug={e.slug}
                  title={e.title}
                  tagline={e.tagline}
                  start={e.startDate}
                  end={e.endDate}
                  timezone={e.timezone}
                  venue={e.mainVenueName}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventCard({
  slug, title, tagline, start, end, timezone, venue, registered, emphasis,
}: {
  slug: string;
  title: string;
  tagline: string | null;
  start: Date;
  end: Date;
  timezone: string;
  venue: string | null;
  registered?: number;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={`/events/${slug}`}
      className={`block rounded-2xl border bg-card p-5 sm:p-6 transition-colors group surface-shadow ${
        emphasis
          ? "border-brand-200 hover:border-brand-400"
          : "border-line hover:border-brand-300"
      }`}
    >
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="min-w-0 flex-1">
          <h3 className={`font-bold text-fg tracking-tight ${emphasis ? "text-xl sm:text-2xl" : "text-lg"}`}>
            {title}
          </h3>
          {tagline && (
            <p className="text-sm text-muted mt-1.5 leading-snug">{tagline}</p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            <Meta icon={Clock}>{formatRange(start, end, timezone)}</Meta>
            {venue && <Meta icon={MapPin}>{venue}</Meta>}
            {typeof registered === "number" && registered > 0 && (
              <Meta icon={Users}>{registered} registered</Meta>
            )}
          </dl>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold ${emphasis ? "text-brand-700 group-hover:text-brand-800" : "text-muted group-hover:text-fg"}`}>
          {emphasis ? "View & register" : "View"}
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

function Meta({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg">
      <Icon size={11} className="text-subtle" />
      {children}
    </span>
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
