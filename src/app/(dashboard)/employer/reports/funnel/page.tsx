import { redirect } from "next/navigation";
import { Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { BarList } from "@/components/employer/reports/BarList";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { funnelReport, cohortFunnel } from "@/lib/employer/reporting/funnel";

export const dynamic = "force-dynamic";

const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";
const Empty = () => <p className="text-sm text-muted py-6 text-center">No data in this period.</p>;

export default async function FunnelReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const [snap, cohort] = await Promise.all([
    funnelReport(access.companyId, range),
    cohortFunnel(access.companyId, range),
  ]);

  return (
    <ReportFrame
      eyebrow="Reports · Funnel"
      icon={<Filter size={20} />}
      title="Recruiting funnel & conversion"
      description={`Snapshot pipeline and true-cohort conversion for ${range.label}.`}
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={`/api/employer/reports/funnel/export?${qs}`}
    >
      <Card className="p-5">
        <h2 className={H2}>
          Snapshot · {snap.total.toLocaleString("en-CA")} application{snap.total === 1 ? "" : "s"}
          {snap.rejected > 0 ? ` · ${snap.rejected} passed / withdrawn` : ""}
        </h2>
        {snap.total === 0 ? (
          <Empty />
        ) : (
          <>
            <BarList
              rows={snap.rows.map((r) => ({
                label: r.label,
                widthPct: r.reachedPct ?? 0,
                value: r.reached.toLocaleString("en-CA"),
                muted: r.reachedPct == null ? "—" : `${Math.round(r.reachedPct)}%`,
              }))}
            />
            {snap.biggestDropKey && snap.biggestDropPct != null && snap.biggestDropPct > 0 && (
              <p className="mt-4 text-[11px] text-muted">
                Biggest drop-off after{" "}
                <span className="font-semibold text-fg">{snap.rows.find((r) => r.key === snap.biggestDropKey)?.label}</span> ({Math.round(snap.biggestDropPct)}% fall off).
              </p>
            )}
          </>
        )}
      </Card>

      <Card className="p-5">
        <h2 className={H2}>
          True cohort · {cohort.cohort.toLocaleString("en-CA")} applicant{cohort.cohort === 1 ? "" : "s"} entered this period
        </h2>
        {cohort.cohort === 0 ? (
          <Empty />
        ) : (
          <BarList
            rows={cohort.rows.map((r) => ({
              label: r.label,
              widthPct: r.reachedPct ?? 0,
              value: r.reached.toLocaleString("en-CA"),
              muted: r.passFromPrev == null ? `${Math.round(r.reachedPct ?? 0)}%` : `${Math.round(r.passFromPrev)}% pass`,
            }))}
          />
        )}
        <p className="mt-4 text-[11px] text-muted">
          Of everyone who <em>applied</em> in this window, the share that ever reached each stage (from the transition history) — true conversion, not a current-stage snapshot.
        </p>
      </Card>
    </ReportFrame>
  );
}
