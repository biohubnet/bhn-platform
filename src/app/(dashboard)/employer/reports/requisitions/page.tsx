import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { requisitionReport } from "@/lib/employer/reporting/requisitions";
import { fmtDays } from "@/lib/employer/reporting/format";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

export default async function RequisitionsReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const report = await requisitionReport(access.companyId, range);

  const maxBucket = Math.max(...report.agingBuckets.map((b) => b.count), 1);
  const counts = [
    { label: "Active", value: report.active },
    { label: "Closed", value: report.closed },
    { label: "Draft", value: report.draft },
    { label: "Expired", value: report.expired },
  ];

  return (
    <ReportFrame
      eyebrow="Reports · Requisitions"
      icon={<ClipboardList size={20} />}
      title="Requisition status & aging"
      description="Open roles, how long they've been open, and which are going stale."
      periodKey={range.key}
      csvHref={`/api/employer/reports/requisitions/export?${qs}`}
    >
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {counts.map((c) => (
          <Card key={c.label} className="px-5 py-4">
            <p className="text-2xl font-bold text-fg tabular-nums">{c.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mt-1">{c.label}</p>
          </Card>
        ))}
      </section>

      <Card className="p-5">
        <h2 className={H2}>Active req aging</h2>
        <BarList
          rows={report.agingBuckets.map((b) => ({
            label: b.label,
            widthPct: (b.count / maxBucket) * 100,
            value: b.count.toLocaleString("en-CA"),
          }))}
          labelWidth="w-16"
        />
        {report.staleCount > 0 && (
          <p className="mt-4 text-[11px] text-muted">
            <span className="font-semibold text-amber-600">{report.staleCount}</span> active req{report.staleCount === 1 ? "" : "s"} open &gt; 30 days with no hire.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className={H2}>All requisitions</h2>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No postings yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-muted font-semibold pb-2 pr-4">Posting</th>
                  {["Status", "Days open", "Applicants", "Hired"].map((h) => (
                    <th key={h} className="text-right text-muted font-semibold pb-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-elevated/30">
                    <td className="py-2.5 pr-4 max-w-[220px]">
                      <span className="truncate block font-medium text-fg">{r.title}</span>
                      {r.stale && <span className="text-[10px] text-amber-600">stale</span>}
                    </td>
                    <td className="text-right py-2.5 px-2 text-muted">{r.status}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{fmtDays(r.daysOpen)}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.applicants}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.hired || "—"}</td>
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
