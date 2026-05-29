import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { sourceReport } from "@/lib/employer/reporting/sources";
import { fmtPercent } from "@/lib/employer/reporting/format";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

export default async function SourcesReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const report = await sourceReport(access.companyId, range);
  const maxApps = Math.max(...report.rows.map((r) => r.applications), 1);

  return (
    <ReportFrame
      eyebrow="Reports · Sources"
      icon={<Share2 size={20} />}
      title="Source effectiveness"
      description={`Where applicants & hires come from for ${range.label}, and how each channel converts.`}
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={`/api/employer/reports/sources/export?${qs}`}
    >
      <Card className="p-5">
        <h2 className={H2}>Applications by source · {report.total.toLocaleString("en-CA")} total</h2>
        {report.total === 0 ? (
          <p className="text-sm text-muted py-6 text-center">No applications in this period.</p>
        ) : (
          <BarList
            rows={report.rows.map((r) => ({
              label: r.label,
              widthPct: (r.applications / maxApps) * 100,
              value: r.applications.toLocaleString("en-CA"),
              muted: r.pctOfTotal == null ? undefined : `${Math.round(r.pctOfTotal)}%`,
            }))}
            labelWidth="w-28"
          />
        )}
        {report.bestSource && (
          <p className="mt-4 text-[11px] text-muted">
            Best hire rate (≥ {report.minVolumeForRanking} apps):{" "}
            <span className="font-semibold text-emerald-600">{report.bestSource}</span>.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className={H2}>Conversion by source</h2>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No data in this period.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-muted font-semibold pb-2 pr-4">Source</th>
                  {["Applications", "% of total", "Interview rate", "Hires", "Hire rate"].map((h) => (
                    <th key={h} className="text-right text-muted font-semibold pb-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((r) => (
                  <tr key={r.source} className="hover:bg-elevated/30">
                    <td className="py-2.5 pr-4 font-medium text-fg">{r.label}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.applications}</td>
                    <td className="text-right py-2.5 px-2 text-muted tabular-nums">{fmtPercent(r.pctOfTotal)}</td>
                    <td className="text-right py-2.5 px-2 text-muted tabular-nums">{fmtPercent(r.interviewRate)}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.hires || "—"}</td>
                    <td className="text-right py-2.5 px-2 font-semibold text-fg tabular-nums">{fmtPercent(r.hireRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ReportFrame>
  );
}
