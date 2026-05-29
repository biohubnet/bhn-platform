import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { diversityReport } from "@/lib/employer/reporting/diversity";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";
const cell = (n: number | null) => (n == null ? <span className="text-muted">—</span> : <span className="tabular-nums">{n}</span>);

export default async function DiversityReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();

  const company = await prisma.company.findUnique({ where: { id: access.companyId }, select: { deiReportingEnabled: true } });
  const enabled = !!company?.deiReportingEnabled;
  const report = await diversityReport(access.companyId, range, enabled);

  return (
    <ReportFrame
      eyebrow="Reports · Diversity"
      icon={<ShieldCheck size={20} />}
      title="Diversity / DEI pipeline"
      description="Voluntary, self-reported representation by stage — aggregate-only and small-count suppressed."
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={enabled ? `/api/employer/reports/diversity/export?${qs}` : undefined}
    >
      {!enabled ? (
        <Card className="p-8 text-center">
          <Lock size={28} className="mx-auto text-muted mb-3" />
          <p className="font-semibold text-fg">DEI reporting is off</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            This report is disabled by default. When enabled, applicants may <strong>voluntarily</strong> self-identify and
            this page shows aggregate, small-count-suppressed representation — never individuals. Enable it only after your
            legal / privacy review.
          </p>
          <Link
            href="/employer/reports/settings"
            className="mt-4 inline-block text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white"
          >
            Go to report settings
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <h2 className={H2}>Coverage</h2>
            <p className="text-sm text-fg">
              <span className="font-bold">{report.consented.toLocaleString("en-CA")}</span> of{" "}
              <span className="font-bold">{report.totalApplicants.toLocaleString("en-CA")}</span> applicants self-identified
              {report.coverage != null ? ` (${Math.round(report.coverage * 100)}%).` : "."}
            </p>
            <p className="mt-2 text-[11px] text-muted">
              Cells below {report.kAnon} are suppressed (shown as “—”). A dimension is hidden entirely unless at least{" "}
              {Math.round(report.coverageMin * 100)}% of applicants answered it, so low-response data can't mislead.
            </p>
          </Card>

          {report.dimensions.map((d) => (
            <Card key={d.key} className="p-5">
              <h2 className={H2}>{d.label}</h2>
              {!d.covered ? (
                <p className="text-sm text-muted py-3">
                  Hidden — fewer than {Math.round(report.coverageMin * 100)}% of applicants answered this in the period.
                </p>
              ) : d.rows.length === 0 ? (
                <p className="text-sm text-muted py-3">No responses in this period.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left text-muted font-semibold pb-2 pr-4">Group</th>
                        {["Applicants", "Reached interview", "Hired"].map((h) => (
                          <th key={h} className="text-right text-muted font-semibold pb-2 px-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {d.rows.map((r) => (
                        <tr key={r.category} className="hover:bg-elevated/30">
                          <td className="py-2.5 pr-4 font-medium text-fg">{r.category}</td>
                          <td className="text-right py-2.5 px-2 text-fg">{cell(r.applicants)}</td>
                          <td className="text-right py-2.5 px-2 text-fg">{cell(r.reachedInterview)}</td>
                          <td className="text-right py-2.5 px-2 text-fg">{cell(r.hired)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}

          <p className="text-[11px] text-muted">
            Voluntary self-ID, never inferred. Aggregate-only and suppressed — this report never identifies an individual.
            Collecting these data carries legal/compliance obligations (e.g. employment-equity rules); confirm your review before relying on it.
          </p>
        </>
      )}
    </ReportFrame>
  );
}
