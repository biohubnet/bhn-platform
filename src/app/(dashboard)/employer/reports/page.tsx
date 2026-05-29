/**
 * /employer/reports — the Talent Reports hub.
 *
 * Leadership one-pager: OKR/RAG KPI tiles (with sparklines) + the
 * pipeline funnel for the selected period. Drill-down reports
 * (funnel, time-to-fill, offers, …) land under /employer/reports/*.
 */
import { redirect } from "next/navigation";
import { FileBarChart } from "lucide-react";
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
          <KpiTile key={t.key} label={t.label} result={t.result} />
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

      <p className="text-[11px] text-muted text-center no-print">
        More detailed reports (funnel, time-to-fill, offers, sources, diversity, cost) are rolling out under this section.
      </p>
    </div>
  );
}
