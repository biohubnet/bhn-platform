import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Briefcase, Clock, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, type Stage } from "@/lib/hiring/transitions";

/**
 * /admin/pipeline-analytics — hiring pipeline health view.
 *
 * Three answers:
 *   1. How many applications are at each stage right now?
 *   2. What's the median time-in-stage across the platform?
 *   3. Which postings have stalled pipelines (oldest stage-entered
 *      rows still pending)?
 *
 * Honest about gaps: time-to-offer is computed from
 * `stageEnteredAt` so backfilled rows (anything before the migration
 * that added the column) get a NULL→reasonable-default treatment
 * with a small footnote.
 */
export const dynamic = "force-dynamic";

export default async function PipelineAnalyticsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // 1. Counts per stage across the whole platform.
  const grouped = await prisma.applicationStatus.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const stageCount = new Map<string, number>();
  for (const r of grouped) stageCount.set(r.status, r._count._all);

  // 2. Median time-in-stage for currently-active applications.
  const active = await prisma.applicationStatus.findMany({
    where: {
      status: { in: ["new", "reviewing", "shortlisted", "interview_scheduled", "interviewed", "offer"] },
    },
    select: { status: true, stageEnteredAt: true },
  });
  const stageDays = new Map<string, number[]>();
  for (const a of active) {
    const days = (Date.now() - a.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (!stageDays.has(a.status)) stageDays.set(a.status, []);
    stageDays.get(a.status)!.push(days);
  }
  function median(arr: number[]): number | null {
    if (arr.length === 0) return null;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // 3. Stalled applications — non-terminal rows with stage-entered
  //    timestamps older than 14 days.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const stalled = await prisma.applicationStatus.findMany({
    where: {
      status: { in: ["new", "reviewing", "shortlisted", "interview_scheduled", "interviewed", "offer"] },
      stageEnteredAt: { lt: cutoff },
    },
    include: {
      applicant: { select: { id: true, name: true, email: true } },
      posting: { select: { id: true, title: true, companyName: true } },
    },
    orderBy: { stageEnteredAt: "asc" },
    take: 20,
  });

  const totalApps = grouped.reduce((sum, r) => sum + r._count._all, 0);
  const hired = stageCount.get("hired") ?? 0;
  const offers = stageCount.get("offer") ?? 0;
  const passedOrWithdrawn = (stageCount.get("passed") ?? 0) + (stageCount.get("withdrawn") ?? 0);

  // Funnel rate: offers / new
  const newCount = stageCount.get("new") ?? 0;
  const offerToApplyRate = totalApps > 0 ? (hired + offers) / totalApps : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Platform · Hiring
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Activity size={22} className="text-brand-600" />
          Pipeline analytics
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Health of the hiring pipeline across every posting on the platform.
          Where applications stall + how the funnel converts.
        </p>
      </header>

      {/* Top-line tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Total applications" value={totalApps} />
        <Tile label="Hired" value={hired} tone="good" />
        <Tile label="Offer outstanding" value={offers} tone="info" />
        <Tile
          label="Conversion to offer"
          value={`${Math.round(offerToApplyRate * 100)}%`}
          sub="(offer + hired) / total"
        />
      </div>

      {/* Stage distribution */}
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-3">
          Stage distribution
        </h2>
        <ul className="space-y-2">
          {([
            "new", "reviewing", "shortlisted", "interview_scheduled",
            "interviewed", "offer", "hired", "passed", "withdrawn",
          ] as Stage[]).map((s) => {
            const count = stageCount.get(s) ?? 0;
            const pct = totalApps > 0 ? (count / totalApps) * 100 : 0;
            const med = median(stageDays.get(s) ?? []);
            return (
              <li key={s} className="text-sm">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-semibold text-fg">{STAGE_LABELS[s]}</span>
                  <span className="text-xs text-muted font-mono">
                    {count} · {pct.toFixed(0)}%
                    {med !== null && ` · median ${med.toFixed(1)}d in-stage`}
                  </span>
                </div>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Stalled */}
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
        <header className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle inline-flex items-center gap-1.5">
            <Clock size={11} /> Stalled (≥ 14 days in stage)
          </h2>
          <p className="text-xs text-muted mt-1">
            Active applications that haven't moved in two weeks. Reach out to
            the employer team to unblock or close the loop.
          </p>
        </header>
        {stalled.length === 0 ? (
          <p className="text-sm text-muted italic">No stalled applications. Pipelines are flowing.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stalled.map((s) => {
              const days = Math.floor((Date.now() - s.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-fg">
                      {s.applicant.name ?? s.applicant.email}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {s.posting.title} · {s.posting.companyName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
                      {STAGE_LABELS[s.status as Stage] ?? s.status}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-amber-700">
                      {days}d
                    </span>
                    <Link
                      href={`/employer/postings/${s.posting.id}/applicants/${s.id}`}
                      className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open <ExternalLink size={9} />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-line bg-card p-5 text-xs text-muted leading-relaxed">
        <p className="font-bold text-fg mb-2 inline-flex items-center gap-1.5">
          <Briefcase size={11} /> Funnel summary
        </p>
        <p>
          {totalApps} applications · {newCount} unseen · {offers} offers
          outstanding · {hired} hired · {passedOrWithdrawn} passed or withdrawn.
        </p>
        <p className="mt-2">
          Time-in-stage medians use the <code className="font-mono bg-elevated px-1 rounded">stageEnteredAt</code> column
          added in migration <code className="font-mono bg-elevated px-1 rounded">20260603000000_hiring_pipeline</code>.
          Pre-migration rows were backfilled from <code className="font-mono bg-elevated px-1 rounded">updatedAt</code>;
          their times are approximate.
        </p>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "good" | "info" | "warn";
}) {
  const tint =
    tone === "good"
      ? "ring-emerald-200 bg-emerald-50"
      : tone === "info"
        ? "ring-violet-200 bg-violet-50"
        : tone === "warn"
          ? "ring-amber-200 bg-amber-50"
          : "ring-line bg-card";
  return (
    <div className={`rounded-xl ring-1 ring-inset p-4 ${tint}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className="text-2xl font-bold text-fg font-mono tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-1">{sub}</p>}
    </div>
  );
}
