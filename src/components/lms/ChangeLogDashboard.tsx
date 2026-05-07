import { Sparkles, Wrench, ArrowUp, MessageSquare, CalendarDays, Activity } from "lucide-react";

interface MonthlyBucket {
  ym: string;       // "2026-05"
  label: string;    // "May 2026"
  count: number;
}

interface DashboardData {
  total: number;
  byKind: Record<string, number>;
  thisMonth: number;
  last30: number;
  daysSinceLast: number | null;
  monthly: MonthlyBucket[];     // last 12 months, oldest → newest
  peakMonthlyCount: number;
}

const KIND_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  feature:     { label: "New",       icon: Sparkles,       cls: "text-brand-700 bg-brand-50 border-brand-200" },
  improvement: { label: "Improved",  icon: ArrowUp,        cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  fix:         { label: "Fix",       icon: Wrench,         cls: "text-amber-700 bg-amber-50 border-amber-200" },
  note:        { label: "Note",      icon: MessageSquare,  cls: "text-muted bg-elevated border-line" },
};

/**
 * On-page dashboard for the changelog: counts, by-kind breakdown, and a
 * 12-month sparkbar showing release cadence at a glance.
 */
export function ChangeLogDashboard({ data }: { data: DashboardData }) {
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

      {/* 12-month sparkbar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">
            Release cadence (last 12 months)
          </p>
          <p className="text-[10px] text-subtle">peak {data.peakMonthlyCount}/mo</p>
        </div>
        <div className="flex items-end gap-1 h-16">
          {data.monthly.map((m) => {
            const pct = data.peakMonthlyCount > 0 ? m.count / data.peakMonthlyCount : 0;
            const heightPct = pct === 0 ? 4 : Math.max(8, Math.round(pct * 100));
            return (
              <div
                key={m.ym}
                className="flex-1 group/bar relative flex flex-col justify-end"
                style={{ height: "100%" }}
              >
                <div
                  className={
                    m.count === 0
                      ? "w-full bg-line rounded-sm"
                      : "w-full bg-gradient-to-t from-brand-700 to-brand-400 rounded-sm hover:opacity-80 transition-opacity"
                  }
                  style={{ height: `${heightPct}%` }}
                />
                {/* Tooltip on hover */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-fg text-bg text-[10px] whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none">
                  {m.label}: {m.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-subtle mt-1">
          <span>{data.monthly[0]?.label.split(" ")[0]}</span>
          <span>{data.monthly[data.monthly.length - 1]?.label.split(" ")[0]}</span>
        </div>
      </div>
    </section>
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
 * Build the dashboard data from a flat list of entries. Buckets entries
 * into the trailing 12 calendar months for the sparkbar. Pure — no DB.
 */
export function buildChangeLogDashboard(
  entries: { kind: string; publishedAt: Date | string }[]
): DashboardData {
  const byKind: Record<string, number> = {};
  const now = new Date();
  const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const labelOf = (y: number, m: number) =>
    new Date(y, m, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });

  // Init last-12 buckets in order
  const monthly: MonthlyBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ ym: ymOf(d), label: labelOf(d.getFullYear(), d.getMonth()), count: 0 });
  }
  const monthlyByYm = new Map(monthly.map((m) => [m.ym, m]));

  let thisMonth = 0;
  let last30 = 0;
  let mostRecent: Date | null = null;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const e of entries) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    const d = new Date(e.publishedAt);
    const bucket = monthlyByYm.get(ymOf(d));
    if (bucket) bucket.count++;
    if (d >= monthStart) thisMonth++;
    if (d >= days30) last30++;
    if (!mostRecent || d > mostRecent) mostRecent = d;
  }

  const peakMonthlyCount = monthly.reduce((m, b) => (b.count > m ? b.count : m), 0);
  const daysSinceLast = mostRecent
    ? Math.floor((now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    total: entries.length,
    byKind,
    thisMonth,
    last30,
    daysSinceLast,
    monthly,
    peakMonthlyCount,
  };
}
