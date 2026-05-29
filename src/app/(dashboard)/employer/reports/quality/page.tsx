import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { qualityReport } from "@/lib/employer/reporting/quality";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

export default async function QualityReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const report = await qualityReport(access.companyId, range);

  const maxRec = Math.max(...report.recommendations.map((r) => r.count), 1);

  return (
    <ReportFrame
      eyebrow="Reports · Quality"
      icon={<Star size={20} />}
      title="Quality of hire"
      description={`Interview scorecard signal for ${range.label} — average scores, recommendation mix, and completion.`}
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={`/api/employer/reports/quality/export?${qs}`}
    >
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiTile label="Avg scorecard score" result={report.avgScore} />
        <KpiTile label="Avg score · hired" result={report.avgScoreHired} />
        <KpiTile label="Scorecard completion" result={report.completionRate} />
      </section>

      <Card className="p-5">
        <h2 className={H2}>Recommendation mix · {report.submitted} submitted</h2>
        {report.submitted === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            No submitted scorecards in this period. Scores appear once interviewers submit their scorecards.
          </p>
        ) : (
          <BarList
            rows={report.recommendations.map((r) => ({
              label: r.label,
              widthPct: (r.count / maxRec) * 100,
              value: r.count.toLocaleString("en-CA"),
            }))}
            labelWidth="w-28"
          />
        )}
      </Card>
    </ReportFrame>
  );
}
