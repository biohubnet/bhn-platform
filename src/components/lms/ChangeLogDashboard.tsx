import { Sparkles, Wrench, ArrowUp, MessageSquare, CalendarDays, Activity } from "lucide-react";

interface DailyBucket {
  ymd: string;       // "2026-05-15"
  label: string;     // "May 15"
  fullLabel: string; // "May 15, 2026"
  count: number;
  /** Sequential index from day 1 — used to drive the build-up animation
   *  so the bar's transition-delay scales with how recent it is. */
  index: number;
}

interface DashboardData {
  total: number;
  byKind: Record<string, number>;
  thisMonth: number;
  last30: number;
  daysSinceLast: number | null;
  /** Every day from the first published entry to today, in order. */
  daily: DailyBucket[];
  peakDailyCount: number;
  firstEntryDate: string | null;
  daysSinceFirst: number;
}

const KIND_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  feature:     { label: "New",       icon: Sparkles,       cls: "text-brand-700 bg-brand-50 border-brand-200" },
  improvement: { label: "Improved",  icon: ArrowUp,        cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  fix:         { label: "Fix",       icon: Wrench,         cls: "text-amber-700 bg-amber-50 border-amber-200" },
  note:        { label: "Note",      icon: MessageSquare,  cls: "text-muted bg-elevated border-line" },
};

/**
 * On-page dashboard for the changelog: counts, by-kind breakdown, and a
 * daily release-cadence chart from the platform's first published entry
 * up through today.
 *
 * Design notes for the chart:
 *   • One bar per day from day-1 → today. As more days accumulate,
 *     each bar's width shrinks (the bars share the container via
 *     flex-1).
 *   • Date labels along the bottom are rotated 45° so they don't
 *     overlap once bars get narrow. We auto-thin the labels — every
 *     Nth date is shown, where N grows with the day count.
 *   • A baseline rule + tick numbers along the right edge form the
 *     "line indicating number of changes made" axis.
 *   • Build-up animation: each bar fades + grows in with a tiny
 *     stagger so the chart visually fills out day-by-day on first
 *     paint. Reduced-motion users get the static end-state.
 */
export function ChangeLogDashboard({ data }: { data: DashboardData }) {
  const days = data.daily.length;
  // Label-thinning: show ~10 dates max regardless of timeline length.
  const labelStride = Math.max(1, Math.ceil(days / 10));
  // Y-axis tick values — show at 100%, 50% of peak (skip 0 since the
  // baseline implies it).
  const peak = Math.max(1, data.peakDailyCount);
  const mid = Math.max(1, Math.round(peak / 2));

  return (
    <section className="bg-card border border-line rounded-2xl p-5 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Stat
          icon={Activity}
          label="Total entries"
          value={data.total}
        />
        <Stat
          icon={CalendarDays}
          label="This month"
          value={data.thisMonth}
          help={`${data.last30} in the last 30 days`}
        />
        <Stat
          icon={Sparkles}
          label="Latest update"
          value={data.daysSinceLast == null
            ? "—"
            : data.daysSinceLast === 0
              ? "Today"
              : data.daysSinceLast === 1
                ? "Yesterday"
                : `${data.daysSinceLast}d ago`
          }
        />
        <ByKindBreakdown byKind={data.byKind} total={data.total} />
      </div>

      {/* Release-cadence chart — daily, day 1 → today */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">
            Release cadence · day-by-day
          </p>
          <p className="text-[10px] text-subtle tabular-nums">
            {days} day{days === 1 ? "" : "s"} · peak {data.peakDailyCount}/day
          </p>
        </div>

        {/* Plot area. Bars sit in a flex row with each bar `flex-1`
            so widths auto-shrink as the timeline grows. A right-side
            gutter (`pr-8`) reserves room for the tick numbers. */}
        <div className="relative pr-8 pb-12">
          {/* Y-axis ticks — drawn as horizontal dashed lines + a
              numeric label on the right edge. Two ticks (peak + mid)
              are enough at this density. */}
          <div className="relative h-24" aria-hidden>
            <YTick value={peak} pctFromTop={0} />
            <YTick value={mid} pctFromTop={50} />
            {/* Baseline — a solid hairline at the foot of the chart. */}
            <div className="absolute left-0 right-0 bottom-0 border-t border-line" />

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-px">
              {data.daily.map((d) => {
                const pct = d.count > 0 ? d.count / peak : 0;
                // Even on a zero day we leave a faint 2px ghost so
                // the day is still discoverable on hover.
                const heightPct = d.count === 0 ? 2 : Math.max(6, Math.round(pct * 100));
                return (
                  <div
                    key={d.ymd}
                    className="flex-1 group/bar relative flex flex-col justify-end min-w-px"
                    style={{ height: "100%" }}
                  >
                    <div
                      className={
                        (d.count === 0
                          ? "w-full bg-line"
                          : "w-full bg-gradient-to-t from-brand-700 to-brand-400 hover:opacity-80")
                        + " rounded-[1px] origin-bottom transition-all duration-300 motion-reduce:transition-none"
                      }
                      style={{
                        height: `${heightPct}%`,
                        // Build-up: bars grow in left-to-right with a
                        // tiny per-day stagger. Capped so very long
                        // timelines don't take forever to settle.
                        animationName: "changelog-bar-grow",
                        animationDuration: "550ms",
                        animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                        animationFillMode: "both",
                        animationDelay: `${Math.min(d.index * 12, 1400)}ms`,
                      }}
                    />
                    {/* Tooltip — works even when the bar is 1px wide
                        because we extend the hover surface to the
                        full column. */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-fg text-bg text-[10px] whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                      {d.fullLabel}: {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis date labels — rotated 45° so they don't overlap.
              We render every label in the DOM but visually hide
              non-stride ones via `invisible` to keep horizontal
              alignment with bars stable. */}
          <div className="absolute left-0 right-8 top-[100%] -mt-9 flex gap-px">
            {data.daily.map((d) => {
              const show = d.index % labelStride === 0 || d.index === days - 1;
              return (
                <div
                  key={d.ymd}
                  className="flex-1 min-w-px relative"
                >
                  {show && (
                    <span
                      className="absolute top-1 left-0 origin-top-left -rotate-45 text-[10px] text-subtle tabular-nums whitespace-nowrap"
                    >
                      {d.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyframes for the build-up animation — scoped to this
          component via a one-off <style> block. Browsers respect
          prefers-reduced-motion via the motion-reduce: utility on
          the bar itself. */}
      <style>{`
        @keyframes changelog-bar-grow {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes changelog-bar-grow {
            from { transform: scaleY(1); opacity: 1; }
            to   { transform: scaleY(1); opacity: 1; }
          }
        }
      `}</style>
    </section>
  );
}

/** Horizontal dashed grid line + right-edge numeric label. Forms the
 *  "line indicating numbers of changes made" axis. */
function YTick({ value, pctFromTop }: { value: number; pctFromTop: number }) {
  return (
    <>
      <div
        className="absolute left-0 right-0 border-t border-dashed border-line opacity-50"
        style={{ top: `${pctFromTop}%` }}
      />
      <span
        className="absolute -right-7 text-[10px] text-subtle tabular-nums leading-none"
        style={{ top: `${pctFromTop}%`, transform: "translateY(-50%)" }}
      >
        {value}
      </span>
    </>
  );
}

function Stat({
  icon: Icon, label, value, help,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  help?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <p className="text-2xl font-bold text-fg mt-1.5">{value}</p>
      {help && <p className="text-[11px] text-subtle mt-0.5">{help}</p>}
    </div>
  );
}

function ByKindBreakdown({ byKind, total }: { byKind: Record<string, number>; total: number }) {
  const order = ["feature", "improvement", "fix", "note"];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">By kind</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {order.map((k) => {
          const count = byKind[k] ?? 0;
          if (count === 0 && total > 0) return null;
          const meta = KIND_META[k] ?? KIND_META.feature;
          const Icon = meta.icon;
          return (
            <span
              key={k}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}
            >
              <Icon size={10} /> {meta.label} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Build the dashboard data from a flat list of entries.
 *
 * Builds the chart timeline as DAILY buckets from the platform's
 * first published entry through today. Bucketing is by local date
 * (UTC would skew bars across timezone boundaries for late-night
 * deploys). When there are no entries at all the timeline degenerates
 * to a single empty day so the chart still has something to render.
 *
 * Pure — no DB.
 */
export function buildChangeLogDashboard(
  entries: { kind: string; publishedAt: Date | string }[]
): DashboardData {
  const byKind: Record<string, number> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight local

  const ymdOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shortLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const fullLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  let earliest: Date | null = null;
  let latest: Date | null = null;
  let thisMonth = 0;
  let last30 = 0;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dailyCounts = new Map<string, number>();
  for (const e of entries) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    const d = new Date(e.publishedAt);
    const dayKey = ymdOf(d);
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);
    if (!earliest || d < earliest) earliest = d;
    if (!latest || d > latest) latest = d;
    if (d >= monthStart) thisMonth++;
    if (d >= days30) last30++;
  }

  // Start the timeline at the first entry's date — or today if there
  // are no entries (so the chart still has one bar to render).
  const start = earliest
    ? new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate())
    : today;

  const daily: DailyBucket[] = [];
  let cursor = new Date(start);
  let i = 0;
  while (cursor <= today) {
    const key = ymdOf(cursor);
    daily.push({
      ymd: key,
      label: shortLabel(cursor),
      fullLabel: fullLabel(cursor),
      count: dailyCounts.get(key) ?? 0,
      index: i,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    i++;
  }

  const peakDailyCount = daily.reduce((m, b) => (b.count > m ? b.count : m), 0);
  const daysSinceLast = latest
    ? Math.floor((now.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const daysSinceFirst = earliest
    ? Math.floor((now.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  return {
    total: entries.length,
    byKind,
    thisMonth,
    last30,
    daysSinceLast,
    daily,
    peakDailyCount,
    firstEntryDate: earliest ? (earliest as Date).toISOString() : null,
    daysSinceFirst,
  };
}
