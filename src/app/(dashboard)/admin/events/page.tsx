import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, ArrowRight, Users, ExternalLink, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventCalendar, type EventDot } from "@/components/events/EventCalendar";
import { DemoEventsControls } from "@/components/events/DemoEventsControls";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/events — list of every BhnEvent on the platform.
 *
 * Phase 1 admin tooling is intentionally narrow:
 *   • List events with registration counts and status
 *   • Click through to the detail page to edit basics + manage
 *     registrations + run check-in
 *
 * Workshop / session / speaker / sponsor CRUD admin UIs are
 * deferred to a later phase — they're managed via the seed file
 * (re-runnable; idempotent) until the volume justifies dedicated
 * UI.
 */
export default async function AdminEventsListPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const events = await prisma.bhnEvent.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      timezone: true,
      mainVenueName: true,
      _count: {
        select: {
          registrations: true,
          workshops: true,
          symposiumSessions: true,
        },
      },
    },
  });

  // Calendar dots — every event regardless of status (admin needs
  // to see drafts and archived editions on the calendar too).
  // Brand-tone the next upcoming edition so it stands out.
  const now = new Date();
  const nextUpcomingId = events
    .filter((e) => e.endDate >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.id ?? null;
  const calendarDots: EventDot[] = events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    start: e.startDate.toISOString(),
    end: e.endDate.toISOString(),
    tone: e.id === nextUpcomingId ? "brand" : "neutral",
  }));

  return (
    <div>
      <PageHero
        eyebrow={<><Calendar size={11} /> Admin · ENGAGE</>}
        title="Events"
        description="Manage BHN Annual Symposium & Training Week editions. Click any event to edit basics, see registrations, and run check-in. Workshops, sessions, speakers, and sponsors are managed via the seed file (prisma/seed-events.ts) until a future phase brings dedicated CRUD UI."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="hidden">
          <p>
          </p>
        </div>
        <DemoEventsControls />
      </header>

      {/* Calendar at the top of the admin page so the back-to-all-
          events nav from event detail lands on the same visual
          context as the public /events landing — sortable list plus
          a glance-able timeline. Empty weeks collapse, weeks with
          events expand for the chips, so the calendar takes less
          space than a uniform-height grid. */}
      {events.length > 0 && (
        <EventCalendar events={calendarDots} monthsAhead={1} />
      )}

      {events.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <Calendar size={20} />
          </div>
          <p className="font-medium text-muted">No events yet</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Run <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">npx tsx prisma/seed-events.ts</code> to populate the demo event,
            or insert rows manually via Prisma Studio.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="relative rounded-2xl border border-line bg-card surface-shadow p-5 hover:border-brand-300 transition-colors"
            >
              {/* Whole-card click target. Sits underneath the
                  "View public page" link via z-index so the public
                  link captures its own clicks. Nested <a> would be
                  invalid HTML — this overlay pattern avoids it. */}
              <Link
                href={`/admin/events/${e.slug}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`Edit ${e.title}`}
              />

              <div className="relative flex flex-wrap items-start justify-between gap-3 pointer-events-none">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-fg tracking-tight">{e.title}</h2>
                    <StatusChip status={e.status} />
                  </div>
                  <p className="text-sm text-muted mt-1.5">
                    {formatRange(e.startDate, e.endDate, e.timezone)}
                    {e.mainVenueName && <> · {e.mainVenueName}</>}
                  </p>
                  <p className="text-xs text-subtle font-mono mt-1">/{e.slug}</p>
                </div>
                <ArrowRight size={16} className="text-subtle shrink-0 mt-1" />
              </div>

              <dl className="relative mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs pointer-events-none">
                <Stat icon={Users} label="Registered" value={e._count.registrations} />
                <Stat icon={Calendar} label="Workshops" value={e._count.workshops} />
                <Stat icon={ExternalLink} label="Sessions" value={e._count.symposiumSessions} />
                {e.status === "published" && (
                  <Link
                    href={`/events/${e.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 font-semibold hover:underline inline-flex items-center gap-1 ml-auto pointer-events-auto"
                  >
                    View public page <ExternalLink size={10} />
                  </Link>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border border-dashed border-line bg-card p-5 text-sm">
        <h2 className="font-bold text-fg mb-2 inline-flex items-center gap-2">
          <Plus size={14} className="text-brand-600" />
          Add a new event
        </h2>
        <p className="text-muted leading-relaxed">
          Phase 1 ships event-basics editing but not full new-event creation
          via UI. To add an edition: copy <code className="font-mono text-fg bg-elevated px-1 rounded">prisma/seed-events.ts</code> as a starting point,
          tweak slug + dates + content, and run with <code className="font-mono text-fg bg-elevated px-1 rounded">npx tsx</code>. The
          seed is idempotent so running it twice is harmless. A "New event"
          form will land alongside workshop / session CRUD UIs in a future
          phase.
        </p>
      </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-fg">
      <Icon size={11} className="text-subtle" />
      <span className="font-mono tabular-nums font-bold">{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tints: Record<string, string> = {
    draft: "bg-elevated text-subtle ring-line",
    published: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    archived: "bg-slate-100 text-slate-800 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[status] ?? tints.draft}`}
    >
      {status}
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
