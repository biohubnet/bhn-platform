import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportFrame, ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { KpiTile } from "@/components/employer/reports/KpiTile";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { offerReport } from "@/lib/employer/reporting/offers";
import { loadTargets, applyTarget } from "@/lib/employer/reporting/targets";

export const dynamic = "force-dynamic";
const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-4";

export default async function OffersReportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const sp = await searchParams;
  const range = resolvePeriod(sp);
  const qs = new URLSearchParams(sp).toString();
  const [report, targets] = await Promise.all([offerReport(access.companyId, range), loadTargets(access.companyId)]);

  const acceptance = applyTarget(report.acceptanceRate, "offer_accept_rate", targets);
  const counts = [
    { label: "Sent", value: report.sent },
    { label: "Accepted", value: report.accepted },
    { label: "Declined", value: report.declined },
    { label: "Expired", value: report.expired },
    { label: "Outstanding", value: report.outstanding },
  ];

  return (
    <ReportFrame
      eyebrow="Reports · Offers"
      icon={<FileSignature size={20} />}
      title="Offer analytics"
      description={`Acceptance, response time, and decline reasons for ${range.label}.`}
      periodKey={range.key}
      companyId={access.companyId}
      csvHref={`/api/employer/reports/offers/export?${qs}`}
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Offer acceptance" result={acceptance} />
        <KpiTile label="Response time (median)" result={report.responseTimeDays} />
        <KpiTile label="Offers sent" result={{ value: report.sent, formatted: report.sent.toLocaleString("en-CA"), unit: "count" }} />
        <KpiTile label="Declined" result={{ value: report.declined, formatted: report.declined.toLocaleString("en-CA"), unit: "count" }} />
      </section>

      <Card className="p-5">
        <h2 className={H2}>Outcome breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {counts.map((c) => (
            <div key={c.label} className="rounded-xl bg-elevated/40 px-3 py-3 text-center">
              <p className="text-xl font-bold text-fg tabular-nums">{c.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className={H2}>Decline reasons</h2>
        {report.declineReasons.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No declined offers in this period.</p>
        ) : (
          <ul className="divide-y divide-line">
            {report.declineReasons.map((d, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-sm text-fg">{d.reason}</span>
                <span className="text-xs font-semibold text-muted tabular-nums shrink-0">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ReportFrame>
  );
}
