/**
 * /employer/reports — the Talent Reports hub.
 *
 * Leadership one-pager: OKR/RAG KPI tiles (with sparklines) + the
 * pipeline funnel for the selected period. Drill-down reports
 * (funnel, time-to-fill, offers, …) land under /employer/reports/*.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileBarChart, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { Card } from "@/components/ui/Card";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";
import { PeriodPicker } from "@/components/employer/reports/PeriodPicker";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { execSummary } from "@/lib/employer/reporting/summary";
import { funnelReport } from "@/lib/employer/reporting/funnel";

export const dynamic = "force-dynamic";

const REPORTS: { href: string; label: string; desc: string; live: boolean }[] = [
  { href: "/employer/reports/funnel",        label: "Funnel & conversion", desc: "Snapshot + true-cohort conversion", live: true },
  { href: "/employer/reports/time-to-fill",  label: "Time to fill",        desc: "Velocity + stage cycle time",       live: true },
  { href: "/employer/reports/offers",        label: "Offer analytics",     desc: "Acceptance, response, declines",    live: true },
  { href: "/employer/reports/requisitions",  label: "Requisitions",        desc: "Status + aging + stale reqs",       live: true },
  { href: "/employer/reports/productivity",  label: "Team productivity",   desc: "Activity by recruiter",             live: true },
  { href: "/employer/reports/quality",       label: "Quality of hire",     desc: "Scorecard signal",                  live: true },
  { href: "/employer/reports/sources",       label: "Source effectiveness",desc: "Where applicants & hires come from",live: true },
  { href: "/employer/reports/cost",          label: "Cost per hire",       desc: "Spend per hire + breakdown",        live: true },
  { href: "/employer/reports/diversity",     label: "Diversity (DEI)",     desc: "Representation by stage (opt-in)",   live: true },
  { href: "/employer/reports/settings",      label: "Report settings",     desc: "Targets, costs & DEI toggle",       live: true },
];

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          {access.reason === "forbidden"
            ? "This page is for employer accounts."
            : "No company workspace found. Contact support if this looks wrong."}
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const withQs = (href: string) => `${href}${qs ? `?${qs}` : ""}`;
  const { companyId } = access;

  const [summary, funnel, hasDemoPostings] = await Promise.all([
    execSummary(companyId, range),
    funnelReport(companyId, range),
    prisma.internshipPosting.count({ where: { companyId, isDemoSeed: true } }).then((n) => n > 0).catch(() => false),
  ]);

  const hasData = funnel.total > 0;

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Insights · Reports"
        icon={<FileBarChart size={20} />}
        title="Talent reports"
        description={`Board-ready hiring KPIs and OKRs for ${range.label}. Pick a period, track goals, and drill into each metric.`}
        actions={<PeriodPicker current={range.key} />}
      />

      <DemoSeederBar hasExistingDemos={hasDemoPostings} />

      {/* Exec summary tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.tiles.map((t) => (
          <KpiTile
            key={t.key}
            label={t.label}
            result={t.result}
            href={withQs(t.href)}
          />
        ))}
      </section>

      {/* Pipeline funnel */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">
            Pipeline · {range.label}
          </h2>
          <span className="text-xs text-muted">
            {funnel.total.toLocaleString("en-CA")} application{funnel.total === 1 ? "" : "s"}
            {funnel.rejected > 0 ? ` · ${funnel.rejected} passed / withdrawn` : ""}
          </span>
        </div>

        {!hasData ? (
          <p className="text-sm text-muted py-6 text-center">
            No applications in this period yet. Use “Seed demo data” above to preview, or widen the period.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {funnel.rows.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-20 shrink-0 text-right">{r.label}</span>
                  <div className="flex-1 h-2.5 bg-fg/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${Math.max(r.reachedPct ?? 0, r.reached > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-fg w-20 text-right tabular-nums">
                    {r.reached.toLocaleString("en-CA")}
                    <span className="text-muted font-normal"> · {r.reachedPct == null ? "—" : `${Math.round(r.reachedPct)}%`}</span>
                  </span>
                </div>
              ))}
            </div>
            {funnel.biggestDropKey && funnel.biggestDropPct != null && funnel.biggestDropPct > 0 && (
              <p className="mt-4 text-[11px] text-muted">
                Biggest drop-off: <span className="font-semibold text-fg">{funnel.rows.find((r) => r.key === funnel.biggestDropKey)?.label}</span> → next stage
                ({Math.round(funnel.biggestDropPct)}% fall off).
              </p>
            )}
          </>
        )}
      </Card>

      {/* All reports nav */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-3 px-1">All reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map((r) =>
            r.live ? (
              <Link key={r.href} href={withQs(r.href)} className="group block rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-400">
                <Card className="px-4 py-3.5 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-fg group-hover:text-brand-600 transition-colors">{r.label}</span>
                    <ArrowRight size={14} className="text-muted group-hover:text-brand-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">{r.desc}</p>
                </Card>
              </Link>
            ) : (
              <Card key={r.href} className="px-4 py-3.5 h-full opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-fg">{r.label}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted ring-1 ring-inset ring-line rounded px-1.5 py-0.5">Soon</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">{r.desc}</p>
              </Card>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
