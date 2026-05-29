/**
 * /employer/reports/print — a boss-ready one-pager. Composes every
 * report into a single document, pinned to data-theme="light" so it
 * exports cleanly on any theme. The .print-root class lets the @media
 * print rules isolate it from the app chrome; the PrintButton triggers
 * the browser's Save-as-PDF.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { BarList } from "@/components/employer/reports/BarList";
import { PrintButton } from "@/components/employer/reports/PrintButton";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { execSummary } from "@/lib/employer/reporting/summary";
import { funnelReport } from "@/lib/employer/reporting/funnel";
import { timeToFillReport } from "@/lib/employer/reporting/timeToFill";
import { offerReport } from "@/lib/employer/reporting/offers";
import { requisitionReport } from "@/lib/employer/reporting/requisitions";
import { costReport } from "@/lib/employer/reporting/cost";
import { sourceReport } from "@/lib/employer/reporting/sources";
import { diversityReport } from "@/lib/employer/reporting/diversity";
import { fmtDays, fmtPercent, fmtMoney } from "@/lib/employer/reporting/format";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-3";

export default async function PrintReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const { companyId } = access;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, deiReportingEnabled: true } });
  const [summary, funnel, ttf, offers, reqs, cost, sources, dei] = await Promise.all([
    execSummary(companyId, range),
    funnelReport(companyId, range),
    timeToFillReport(companyId, range),
    offerReport(companyId, range),
    requisitionReport(companyId, range),
    costReport(companyId, range),
    sourceReport(companyId, range),
    diversityReport(companyId, range, !!company?.deiReportingEnabled),
  ]);

  const Row = ({ k, v }: { k: string; v: string }) => (
    <li className="flex justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-fg tabular-nums">{v}</span>
    </li>
  );

  return (
    <div data-theme="light" className="print-root space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">Talent report</p>
          <h1 className="text-xl font-bold text-fg">{company?.name ?? "Company"}</h1>
          <p className="text-xs text-muted">{range.label}</p>
        </div>
        <PrintButton />
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 print-section">
        {summary.tiles.map((t) => (
          <KpiTile key={t.key} label={t.label} result={t.result} />
        ))}
      </section>

      <section className="print-section">
        <h2 className={H2}>Pipeline · {funnel.total.toLocaleString("en-CA")} applications</h2>
        {funnel.total > 0 ? (
          <BarList
            rows={funnel.rows.map((r) => ({
              label: r.label,
              widthPct: r.reachedPct ?? 0,
              value: r.reached.toLocaleString("en-CA"),
              muted: r.reachedPct == null ? "—" : `${Math.round(r.reachedPct)}%`,
            }))}
          />
        ) : (
          <p className="text-sm text-muted">No applications in this period.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-6 print-section">
        <div>
          <h2 className={H2}>Velocity</h2>
          <ul className="text-sm space-y-1">
            <Row k="Time to fill (median)" v={fmtDays(ttf.timeToFill.value)} />
            <Row k="Time to hire (median)" v={fmtDays(ttf.timeToHire.value)} />
          </ul>
        </div>
        <div>
          <h2 className={H2}>Offers</h2>
          <ul className="text-sm space-y-1">
            <Row k="Acceptance" v={fmtPercent(offers.acceptanceRate.value)} />
            <Row k="Accepted / declined" v={`${offers.accepted} / ${offers.declined}`} />
            <Row k="Response time (median)" v={fmtDays(offers.responseTimeDays.value)} />
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6 print-section">
        <div>
          <h2 className={H2}>Requisitions</h2>
          <ul className="text-sm space-y-1">
            <Row k="Active" v={String(reqs.active)} />
            <Row k="Closed" v={String(reqs.closed)} />
            <Row k="Stale (>30d, no hire)" v={String(reqs.staleCount)} />
          </ul>
        </div>
        <div>
          <h2 className={H2}>Cost</h2>
          <ul className="text-sm space-y-1">
            <Row k="Cost per hire" v={cost.costPerHire.formatted} />
            <Row k="Total spend" v={fmtMoney(cost.totalSpend, cost.currency)} />
            <Row k="Hires" v={String(cost.hires)} />
          </ul>
        </div>
      </section>

      {sources.total > 0 && (
        <section className="print-section">
          <h2 className={H2}>Top sources</h2>
          <BarList
            rows={sources.rows.slice(0, 6).map((s) => ({
              label: s.label,
              widthPct: s.pctOfTotal ?? 0,
              value: s.applications.toLocaleString("en-CA"),
              muted: `${s.hires} hire${s.hires === 1 ? "" : "s"}`,
            }))}
            labelWidth="w-28"
          />
        </section>
      )}

      {dei.enabled && (
        <section className="print-section">
          <h2 className={H2}>Diversity (aggregate, suppressed)</h2>
          <p className="text-xs text-muted">
            {dei.consented.toLocaleString("en-CA")} of {dei.totalApplicants.toLocaleString("en-CA")} self-identified
            {dei.coverage != null ? ` (${Math.round(dei.coverage * 100)}%)` : ""}. Cells below {dei.kAnon} suppressed. See the
            diversity report for the per-group breakdown.
          </p>
        </section>
      )}

      <p className="text-[10px] text-muted pt-2 border-t border-line">
        Generated from BioHubNet Talent Reports · {range.label}
      </p>
    </div>
  );
}
