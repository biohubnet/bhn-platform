import { redirect } from "next/navigation";
import { Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { timeToFillReport } from "@/lib/employer/reporting/timeToFill";
import { loadTargets, applyTarget } from "@/lib/employer/reporting/targets";
import { fmtDays } from "@/lib/employer/reporting/format";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

export default async function TimeToFillReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const [report, targets] = await Promise.all([
    timeToFillReport(access.companyId, range),
    loadTargets(access.companyId),
  ]);

  const ttf = applyTarget(report.timeToFill, "time_to_fill_days", targets);
  const tth = applyTarget(report.timeToHire, "time_to_hire_days", targets);
  const maxCycle = Math.max(...report.cycleByBand.map((c) => c.medianDays ?? 0), 1);

  return (
    <ReportFrame
      eyebrow="Reports · Velocity"
      icon={<Timer size={20} />}
      title="Time to fill & cycle time"
      description={`How long hiring takes for ${range.label} — req open → hire, apply → hire, and time in each stage.`}
      periodKey={range.key}
      csvHref={`/api/employer/reports/time-to-fill/export?${qs}`}
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Time to fill (median)" result={ttf} />
        <KpiTile label="Time to hire (median)" result={tth} />
        <KpiTile label="Fastest 25% fill" result={{ value: report.p25, formatted: fmtDays(report.p25), unit: "days" }} />
        <KpiTile label="Slowest 25% fill" result={{ value: report.p75, formatted: fmtDays(report.p75), unit: "days" }} />
      </section>

      <Card className="p-5">
        <h2 className={H2}>Median time in stage</h2>
        {report.cycleByBand.every((c) => c.medianDays == null) ? (
          <p className="text-sm text-muted py-6 text-center">
            Not enough transition history yet — stage cycle time appears once candidates move through stages.
          </p>
        ) : (
          <BarList
            rows={report.cycleByBand.map((c) => ({
              label: c.label,
              widthPct: c.medianDays == null ? 0 : (c.medianDays / maxCycle) * 100,
              value: fmtDays(c.medianDays),
              muted: `n=${c.n}`,
            }))}
          />
        )}
        {report.bottleneckKey && (
          <p className="mt-4 text-[11px] text-muted">
            Bottleneck:{" "}
            <span className="font-semibold text-fg">
              {report.cycleByBand.find((c) => c.key === report.bottleneckKey)?.label}
            </span>{" "}
            has the longest median dwell.
          </p>
        )}
      </Card>
    </ReportFrame>
  );
}
