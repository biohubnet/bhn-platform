import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { costReport } from "@/lib/employer/reporting/cost";
import { loadTargets, applyTarget } from "@/lib/employer/reporting/targets";
import { fmtMoney } from "@/lib/employer/reporting/format";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

const TYPE_LABELS: Record<string, string> = {
  advertising: "Advertising", agency_fee: "Agency fees", referral_bonus: "Referral bonuses",
  tooling: "Tooling", events: "Events", relocation: "Relocation", other: "Other",
};

export default async function CostReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const [report, targets] = await Promise.all([costReport(access.companyId, range), loadTargets(access.companyId)]);
  const cph = applyTarget(report.costPerHire, "cost_per_hire", targets);
  const maxType = Math.max(...report.byType.map((t) => t.amount), 1);

  return (
    <ReportFrame
      eyebrow="Reports · Cost"
      icon={<DollarSign size={20} />}
      title="Cost per hire"
      description={`Recruiting spend and cost-per-hire for ${range.label}. Add cost lines in report settings.`}
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={`/api/employer/reports/cost/export?${qs}`}
    >
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiTile label="Cost per hire" result={cph} />
        <KpiTile label="Total spend" result={{ value: report.totalSpend, formatted: fmtMoney(report.totalSpend, report.currency), unit: "currency" }} />
        <KpiTile label="Hires" result={{ value: report.hires, formatted: report.hires.toLocaleString("en-CA"), unit: "count" }} />
      </section>

      <Card className="p-5">
        <h2 className={H2}>Spend by type</h2>
        {report.byType.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            No recruiting costs recorded for this period. Add them under report settings.
          </p>
        ) : (
          <BarList
            rows={report.byType.map((t) => ({
              label: TYPE_LABELS[t.costType] ?? t.costType,
              widthPct: (t.amount / maxType) * 100,
              value: fmtMoney(t.amount, report.currency),
            }))}
            labelWidth="w-28"
          />
        )}
      </Card>

      {report.byPosting.length > 0 && (
        <Card className="p-5">
          <h2 className={H2}>Spend by posting</h2>
          <ul className="divide-y divide-line">
            {report.byPosting.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-fg truncate">{p.title}</span>
                <span className="text-xs font-semibold text-fg tabular-nums shrink-0">{fmtMoney(p.amount, report.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </ReportFrame>
  );
}
