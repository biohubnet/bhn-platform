/**
 * /admin/assist — health, helpfulness and findings dashboard for
 * the AI behaviour-assist pipeline.
 *
 * Six sections, top to bottom:
 *   1. Health strip       — active users, opt-in %, ingestion rate,
 *                           open hints, AI calls today.
 *   2. Helpfulness panel  — per-help-card helpful-rate +
 *                           dismiss-rate. Drives card retirement /
 *                           prompt-tuning decisions.
 *   3. Top stuck surfaces — surfaces with the highest density of
 *                           rage-clicks / form-abandons / errors in
 *                           the last 7 days.
 *   4. Recent hints       — the latest 50 hints across all users,
 *                           with confidence + outcome.
 *   5. Latest weekly      — most recent journey summaries — a quick
 *      summaries            scan of what real users have been doing.
 *   6. Operator actions   — kick the rollup cron, kick the weekly
 *                           summary cron, run AI inference on a
 *                           specific user, view raw export.
 *
 * Auth: admin or superadmin only.
 */
import Link from "next/link";
import { ArrowLeft, Activity, Sparkles, AlertTriangle, Users, Clock, Share2, Pipette } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssistAdminTools } from "@/components/admin/AssistAdminTools";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { DSSection } from "@/components/design-system/DSSection";
import { DSStatGrid, DSStat } from "@/components/design-system/DSStatGrid";

export const dynamic = "force-dynamic";

function startOfDayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = startOfDayUTC();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export default async function AdminAssistDashboardPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const today = startOfDayUTC();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  // ── 1. Health metrics ──────────────────────────────────────
  const [
    totalConsented,
    totalUsers,
    activeLast7d,
    eventsLast24h,
    openHints,
    aiHintsToday,
    pendingHints,
  ] = await Promise.all([
    prisma.assistPreferences.count({ where: { consented: true } }),
    prisma.user.count(),
    prisma.assistEvent.groupBy({
      by: ["userId"],
      where: { ts: { gte: sevenDaysAgo } },
    }).then((r) => r.length),
    prisma.assistEvent.count({ where: { ts: { gte: daysAgo(1) } } }),
    prisma.assistHint.count({ where: { status: { in: ["pending", "shown"] } } }),
    prisma.assistHint.count({
      where: { triggeredBy: { startsWith: "ai:" }, createdAt: { gte: today } },
    }),
    prisma.assistHint.count({ where: { status: "pending", expiresAt: { gt: new Date() } } }),
  ]);

  const optInRate = totalUsers > 0 ? (totalConsented / totalUsers) : 0;

  // ── 2. Helpfulness by help key ────────────────────────────
  // helpful = (clicked + rated 4–5) / shown
  // dismiss = dismissed / shown
  const helpfulnessRows: Array<{
    helpKey: string;
    shown: bigint;
    clicked: bigint;
    dismissed: bigint;
    ignored: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      h."helpKey",
      COUNT(*) FILTER (WHERE h."shownAt" IS NOT NULL)                                              AS shown,
      COUNT(*) FILTER (WHERE h.status = 'clicked')                                                  AS clicked,
      COUNT(*) FILTER (WHERE h.status = 'dismissed')                                                AS dismissed,
      COUNT(*) FILTER (WHERE h.status = 'ignored')                                                  AS ignored
    FROM "AssistHint" h
    WHERE h."createdAt" >= ${thirtyDaysAgo}
    GROUP BY h."helpKey"
    ORDER BY shown DESC
    LIMIT 20
  `;

  // ── 3. Top stuck surfaces over the last 7d ────────────────
  const stuckSurfaces: Array<{
    surface: string;
    rageClicks: bigint;
    deadClicks: bigint;
    formAbandons: bigint;
    errors: bigint;
    dwellMs: bigint;
    users: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      surface,
      SUM("rageClicks")  AS "rageClicks",
      SUM("deadClicks")  AS "deadClicks",
      SUM("formAbandons") AS "formAbandons",
      SUM(errors)        AS errors,
      SUM("dwellMs")     AS "dwellMs",
      COUNT(DISTINCT "userId") AS users
    FROM "AssistDailyRollup"
    WHERE day >= ${sevenDaysAgo}
    GROUP BY surface
    ORDER BY (SUM("rageClicks") + SUM(errors) + SUM("formAbandons")) DESC
    LIMIT 12
  `;

  // ── 4. Recent hints (50) ──────────────────────────────────
  const recentHints = await prisma.assistHint.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, helpKey: true, surface: true, triggeredBy: true,
      confidence: true, status: true, createdAt: true,
    },
  });

  // ── 5. Latest weekly summaries (limit 10, redact userId for
  //      privacy — we show the journey text only) ───────────
  const recentSummaries = await prisma.assistWeeklySummary.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { weekStart: true, summary: true, stuckOn: true, createdAt: true },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/admin"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Admin overview
      </Link>

      <DSPageHeader
        eyebrow="Admin · platform"
        title="AutoPipette"
        icon={Pipette}
        description={
          <>
            Health, helpfulness, and findings for AutoPipette — BHN&apos;s
            AI lab partner that dispenses a single, precise hint when
            a learner looks stuck. Per-user data on this page is
            aggregated; for individual drill-down, take a user id and
            visit{" "}
            <code className="font-mono text-fg bg-elevated px-1 rounded">
              /profile/assist-history
            </code>{" "}
            while view-as&apos;d as them.
          </>
        }
      />

      {/* ── 1. Health strip ──────────────────────────────────── */}
      <DSStatGrid>
        <DSStat
          icon={Users}
          label="Opted in"
          value={totalConsented}
          help={`${(optInRate * 100).toFixed(0)}% of ${totalUsers} users`}
          tone="brand"
        />
        <DSStat icon={Activity} label="Active 7d" value={activeLast7d} help="distinct users" tone="violet" />
        <DSStat icon={Clock} label="Events 24h" value={eventsLast24h} help="raw signal volume" tone="emerald" />
        <DSStat
          icon={Sparkles}
          label="Open hints"
          value={openHints}
          help={`${pendingHints} pending · ${aiHintsToday} AI today`}
          tone="rose"
          accent={openHints > 0 ? "brand" : undefined}
        />
      </DSStatGrid>

      {/* ── 2. Helpfulness ───────────────────────────────────── */}
      <DSSection
        eyebrow="Last 30 days"
        title="Helpfulness by help card"
        icon={Sparkles}
      >
        {helpfulnessRows.length === 0 ? (
          <p className="text-sm text-subtle">No hints surfaced yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-elevated text-subtle">
                <tr>
                  <th className="text-left px-3 py-2">Card key</th>
                  <th className="text-right px-3 py-2">Shown</th>
                  <th className="text-right px-3 py-2">Clicked</th>
                  <th className="text-right px-3 py-2">Dismissed</th>
                  <th className="text-right px-3 py-2">Ignored</th>
                  <th className="text-right px-3 py-2">Helpful%</th>
                  <th className="text-right px-3 py-2">Dismiss%</th>
                </tr>
              </thead>
              <tbody>
                {helpfulnessRows.map((r) => {
                  const shown = Number(r.shown);
                  const clicked = Number(r.clicked);
                  const dismissed = Number(r.dismissed);
                  const ignored = Number(r.ignored);
                  const helpful = shown > 0 ? clicked / shown : 0;
                  const dismissRate = shown > 0 ? dismissed / shown : 0;
                  return (
                    <tr key={r.helpKey} className="border-t border-line">
                      <td className="px-3 py-2 font-mono text-fg truncate max-w-[260px]">{r.helpKey}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{shown}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{clicked}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">{dismissed}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">{ignored}</td>
                      <td className={"px-3 py-2 text-right tabular-nums font-semibold " + (helpful >= 0.3 ? "text-emerald-700" : helpful >= 0.15 ? "text-amber-700" : "text-rose-700")}>
                        {(helpful * 100).toFixed(0)}%
                      </td>
                      <td className={"px-3 py-2 text-right tabular-nums " + (dismissRate >= 0.5 ? "text-rose-700" : "text-muted")}>
                        {(dismissRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-subtle mt-3 leading-snug">
          Industry benchmark for JIT-help systems: 20–40% helpful. Cards under 15% are candidates for retirement or rewrite; cards over 50% dismiss% are interrupting too aggressively.
        </p>
      </DSSection>

      {/* ── 3. Top stuck surfaces ────────────────────────────── */}
      <DSSection
        eyebrow="Last 7 days"
        title="Top stuck surfaces"
        icon={AlertTriangle}
      >
        {stuckSurfaces.length === 0 ? (
          <p className="text-sm text-subtle">No stuck-state aggregates yet — run the rollup cron once events are flowing.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-elevated text-subtle">
                <tr>
                  <th className="text-left px-3 py-2">Surface</th>
                  <th className="text-right px-3 py-2">Users</th>
                  <th className="text-right px-3 py-2">Rage</th>
                  <th className="text-right px-3 py-2">Dead</th>
                  <th className="text-right px-3 py-2">Abandons</th>
                  <th className="text-right px-3 py-2">Errors</th>
                  <th className="text-right px-3 py-2">Dwell (min)</th>
                </tr>
              </thead>
              <tbody>
                {stuckSurfaces.map((s) => (
                  <tr key={s.surface} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-fg truncate max-w-[260px]">{s.surface}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(s.users)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">{Number(s.rageClicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(s.deadClicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">{Number(s.formAbandons)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">{Number(s.errors)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {(Number(s.dwellMs) / 1000 / 60).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DSSection>

      {/* ── 5. Latest weekly summaries ───────────────────────── */}
      {recentSummaries.length > 0 && (
        <DSSection
          eyebrow="LLM-written journey snapshots"
          title="Latest weekly findings"
          icon={Share2}
        >
          <ul className="space-y-3">
            {recentSummaries.map((s, i) => (
              <li key={i} className="rounded-xl border border-line bg-card-solid p-3">
                <p className="text-[10px] text-subtle font-mono tabular-nums">
                  Week of {s.weekStart.toISOString().slice(0, 10)}
                </p>
                <p className="text-sm text-fg leading-relaxed mt-1">{s.summary}</p>
                {s.stuckOn.length > 0 && (
                  <p className="text-[11px] text-subtle mt-2">
                    Stuck on: {s.stuckOn.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </DSSection>
      )}

      {/* ── 4. Recent hints ──────────────────────────────────── */}
      <DSSection
        eyebrow="Last 50 across all users"
        title="Recent hints"
        icon={Sparkles}
      >
        {recentHints.length === 0 ? (
          <p className="text-sm text-subtle">No hints have been queued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-elevated text-subtle">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Card</th>
                  <th className="text-left px-3 py-2">Surface</th>
                  <th className="text-left px-3 py-2">Trigger</th>
                  <th className="text-right px-3 py-2">Conf%</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentHints.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-[10px] text-subtle">
                      {h.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 font-mono text-fg truncate max-w-[180px]">{h.helpKey}</td>
                    <td className="px-3 py-2 text-muted truncate max-w-[160px]">{h.surface ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{h.triggeredBy}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(h.confidence * 100).toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={h.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DSSection>

      {/* ── 6. Operator actions ──────────────────────────────── */}
      <AssistAdminTools />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "clicked"   ? "bg-emerald-50 text-emerald-800 ring-emerald-200" :
    status === "dismissed" ? "bg-rose-50 text-rose-800 ring-rose-200" :
    status === "shown"     ? "bg-brand-50 text-brand-800 ring-brand-200" :
    status === "expired"   ? "bg-slate-100 text-slate-700 ring-slate-200" :
    status === "suppressed"? "bg-amber-50 text-amber-800 ring-amber-200" :
                             "bg-elevated text-muted ring-line";
  return (
    <span className={"inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset " + tone}>
      {status}
    </span>
  );
}
