/**
 * /employer/analytics — hiring pipeline analytics.
 *
 * Computes funnel metrics, stage velocity, and offer outcomes
 * server-side for instant SSR. Gated to employer or admin.
 */

import { redirect } from "next/navigation";
import { BarChart3, Download, Users, UserCheck, Percent, Briefcase } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/employer/company";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { Card } from "@/components/ui/Card";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";

export const dynamic = "force-dynamic";

// ── Stage ordering ────────────────────────────────────────────────

const STAGE_ORDER = [
  "new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer", "hired",
] as const;
type Stage = (typeof STAGE_ORDER)[number];

const STAGE_LABELS: Record<Stage, string> = {
  new:          "New",
  reviewing:    "Reviewing",
  shortlisted:  "Shortlisted",
  phone_screen: "Phone screen",
  onsite:       "On-site",
  offer:        "Offer",
  hired:        "Hired",
};

// ── Helper ────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

// ── Page ─────────────────────────────────────────────────────────

export default async function EmployerAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId   = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin  = userRole === "admin" || userRole === "superadmin";

  if (userRole !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This page is for employer accounts.</p>
      </div>
    );
  }

  // ── Resolve companyId ──────────────────────────────────────────
  let companyId: string | null = isAdmin ? null : await getActiveCompanyId(userId).catch(() => null);

  if (!companyId && isAdmin) {
    try {
      const existing = await prisma.company.findFirst({
        orderBy: { createdAt: "asc" },
        select:  { id: true },
      });
      if (existing) {
        companyId = existing.id;
        await prisma.companyMember.upsert({
          where:  { companyId_userId: { companyId, userId } },
          create: { companyId, userId, role: "owner", joinedAt: new Date() },
          update: {},
        });
      }
    } catch {
      // DB error during bootstrap — fall through to "no company" empty state
      companyId = null;
    }
  }

  if (!companyId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          No company workspace found. Contact support if this looks wrong.
        </p>
      </div>
    );
  }

  // ── Demo seed check ────────────────────────────────────────────

  const hasDemoPostings = companyId
    ? (await prisma.internshipPosting.count({
        where: { createdById: userId, isDemoSeed: true },
      }).catch(() => 0)) > 0
    : false;

  // ── Fetch data ─────────────────────────────────────────────────

  const [postings, stageCounts, stageVelocityRows] = await Promise.all([
    prisma.internshipPosting.findMany({
      where:   { companyId },
      select:  { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as Array<{ id: string; title: string; status: string }>),

    // Per-posting, per-stage counts
    prisma.applicationStatus.groupBy({
      by:    ["postingId", "status"],
      where: { posting: { companyId } },
      _count: { status: true },
    }).catch(() => [] as Array<{ postingId: string; status: string; _count: { status: number } }>),

    // Avg days per stage (use createdAt proxy via groupBy on status+stageEnteredAt)
    prisma.applicationStatus.findMany({
      where:  {
        posting: { companyId },
        stageEnteredAt: { not: undefined },
      },
      select: { status: true, stageEnteredAt: true, createdAt: true },
    }).catch(() => [] as Array<{ status: string; stageEnteredAt: Date; createdAt: Date }>),
  ]);

  // ── Compute per-posting funnel ─────────────────────────────────

  type PostingRow = {
    id:     string;
    title:  string;
    status: string;
    counts: Record<string, number>;
    total:  number;
  };

  const countsByPosting = new Map<string, Record<string, number>>();
  for (const g of stageCounts) {
    const m = countsByPosting.get(g.postingId) ?? {};
    m[g.status] = g._count.status;
    countsByPosting.set(g.postingId, m);
  }

  const postingRows: PostingRow[] = postings.map((p) => {
    const counts = countsByPosting.get(p.id) ?? {};
    const total  = Object.values(counts).reduce((a, b) => a + b, 0);
    return { id: p.id, title: p.title, status: p.status, counts, total };
  });

  // ── Company-wide summary ───────────────────────────────────────

  const totalApplicants = postingRows.reduce((a, r) => a + r.total, 0);
  const totalHired      = postingRows.reduce((a, r) => a + (r.counts.hired ?? 0), 0);
  const totalOffered    = postingRows.reduce((a, r) => a + (r.counts.offer ?? 0) + (r.counts.hired ?? 0), 0);
  const offerAcceptPct  = pct(totalHired, totalOffered);
  const activePostings  = postings.filter((p) => p.status === "active").length;

  // ── Avg days per stage ─────────────────────────────────────────

  type StageStats = { totalDays: number; count: number };
  const stageStats: Record<string, StageStats> = {};

  for (const row of stageVelocityRows) {
    const days = Math.max(
      0,
      (Date.now() - row.stageEnteredAt.getTime()) / 86_400_000,
    );
    const s = stageStats[row.status] ?? { totalDays: 0, count: 0 };
    s.totalDays += days;
    s.count     += 1;
    stageStats[row.status] = s;
  }

  const velocityStages = STAGE_ORDER
    .filter((s) => stageStats[s]?.count > 0)
    .map((s) => ({
      stage:   s,
      label:   STAGE_LABELS[s],
      avgDays: stageStats[s].totalDays / stageStats[s].count,
      count:   stageStats[s].count,
    }));

  const maxDays = Math.max(...velocityStages.map((v) => v.avgDays), 1);

  // ── Summary card config ────────────────────────────────────────

  const summaryCards = [
    { label: "Total applicants", value: totalApplicants.toLocaleString(), icon: Users,      colour: "text-brand" },
    { label: "Total hired",       value: totalHired.toLocaleString(),      icon: UserCheck,  colour: "text-emerald-600" },
    { label: "Offer acceptance",  value: offerAcceptPct,                   icon: Percent,    colour: "text-violet-600" },
    { label: "Active postings",   value: activePostings.toLocaleString(),  icon: Briefcase,  colour: "text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Insights"
        icon={<BarChart3 size={20} />}
        title="Hiring analytics"
        description="Pipeline conversion rates, stage velocity, and offer outcomes across all your postings."
        actions={
          <a
            href="/api/employer/analytics/export"
            download
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ring-1 ring-line bg-card hover:bg-elevated text-fg transition-colors"
          >
            <Download size={13} /> Download CSV
          </a>
        }
      />

      <DemoSeederBar hasExistingDemos={hasDemoPostings} />

      {/* Summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, icon: Icon, colour }) => (
          <Card key={label} className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">
                {label}
              </span>
              <Icon size={15} className={colour} />
            </div>
            <p className="text-2xl font-bold text-fg">{value}</p>
          </Card>
        ))}
      </section>

      {/* Per-posting funnel table */}
      <Card className="p-5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4">
          Pipeline by posting
        </h2>
        {postingRows.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No postings yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-muted font-semibold pb-2 pr-4 whitespace-nowrap">Posting</th>
                  {["Total", "New", "Reviewing", "Shortlisted", "Phone", "Offer", "Hired"].map((h) => (
                    <th key={h} className="text-right text-muted font-semibold pb-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {postingRows.map((r) => (
                  <tr key={r.id} className="hover:bg-elevated/30 transition-colors">
                    <td className="py-2.5 pr-4 max-w-[180px]">
                      <span className="truncate block font-medium text-fg">{r.title}</span>
                      <span className={`text-[10px] ${
                        r.status === "active"
                          ? "text-emerald-600"
                          : r.status === "closed"
                          ? "text-muted"
                          : "text-amber-600"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    {[
                      r.total,
                      r.counts.new ?? 0,
                      r.counts.reviewing ?? 0,
                      r.counts.shortlisted ?? 0,
                      r.counts.phone_screen ?? 0,
                      r.counts.offer ?? 0,
                      r.counts.hired ?? 0,
                    ].map((v, i) => (
                      <td key={i} className="text-right py-2.5 px-2 text-fg tabular-nums">
                        {v || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stage velocity */}
      <Card className="p-5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4">
          Avg. days per stage
        </h2>
        {velocityStages.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">Not enough data yet.</p>
        ) : (
          <div className="space-y-3">
            {velocityStages.map((v) => (
              <div key={v.stage} className="flex items-center gap-3">
                <span className="text-xs text-muted w-24 shrink-0 text-right">{v.label}</span>
                <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${Math.round((v.avgDays / maxDays) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-fg w-14 tabular-nums">
                  {v.avgDays < 1
                    ? "< 1 day"
                    : `${v.avgDays.toFixed(1)} days`}
                </span>
                <span className="text-[10px] text-muted w-10 text-right">
                  n={v.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
