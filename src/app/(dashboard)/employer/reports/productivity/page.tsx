import { redirect } from "next/navigation";
import { Users2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { productivityReport } from "@/lib/employer/reporting/productivity";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", manager: "Manager", generalist: "Generalist", viewer: "Viewer",
};

export default async function ProductivityReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const report = await productivityReport(access.companyId, range);

  return (
    <ReportFrame
      eyebrow="Reports · Team"
      icon={<Users2 size={20} />}
      title="Recruiter & team productivity"
      description={`Who did what for ${range.label} — activity volume, interviews, scorecards, and hires per teammate.`}
      periodKey={range.key}
      csvHref={`/api/employer/reports/productivity/export?${qs}`}
    >
      <Card className="p-5">
        <h2 className={H2}>By teammate</h2>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            No recorded activity in this period. Activity accrues as your team moves candidates, schedules interviews, and submits scorecards — seed a demo team + demo data to preview.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-muted font-semibold pb-2 pr-4">Member</th>
                  {["Actions", "Interviews", "Scorecards", "Hires"].map((h) => (
                    <th key={h} className="text-right text-muted font-semibold pb-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-elevated/30">
                    <td className="py-2.5 pr-4">
                      <span className="block font-medium text-fg">{r.name}</span>
                      <span className="text-[10px] text-muted">{r.title || (r.role ? ROLE_LABEL[r.role] ?? r.role : "")}</span>
                    </td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.actions}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.interviews}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.scorecards}</td>
                    <td className="text-right py-2.5 px-2 text-fg tabular-nums">{r.hires || "—"}</td>
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
