import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings2, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";
import { ReportAccessError } from "@/components/employer/reports/ReportFrame";
import { ReportSettingsClient } from "@/components/employer/reports/ReportSettingsClient";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { TARGET_METRICS } from "@/lib/employer/reporting/targets";

export const dynamic = "force-dynamic";

export default async function ReportSettingsPage() {
  const access = await resolveReportAccess();
  if (!access.ok) {
    if (access.reason === "unauth") redirect("/login");
    return <ReportAccessError reason={access.reason} />;
  }
  const { companyId, userId, realRole } = access;

  const [targetsRaw, costsRaw, company, membership] = await Promise.all([
    prisma.hiringTarget.findMany({
      where: { companyId },
      select: { id: true, metricKey: true, targetValue: true, comparator: true, period: true, postingId: true },
      orderBy: { metricKey: "asc" },
    }),
    prisma.recruitingCost.findMany({
      where: { companyId },
      select: { id: true, costType: true, amount: true, currency: true, incurredAt: true },
      orderBy: { incurredAt: "desc" },
      take: 50,
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { deiReportingEnabled: true } }),
    prisma.companyMember.findUnique({ where: { companyId_userId: { companyId, userId } }, select: { role: true } }),
  ]);

  const labelByKey = new Map(TARGET_METRICS.map((m) => [m.key, m.label]));
  const targets = targetsRaw
    .filter((t) => t.postingId === null)
    .map((t) => ({
      id: t.id,
      metricKey: t.metricKey,
      label: labelByKey.get(t.metricKey) ?? t.metricKey,
      targetValue: Number(t.targetValue),
      comparator: t.comparator,
      period: t.period,
    }));
  const costs = costsRaw.map((c) => ({
    id: c.id,
    costType: c.costType,
    amount: Number(c.amount),
    currency: c.currency,
    incurredAt: c.incurredAt.toISOString(),
  }));
  const metricOptions = TARGET_METRICS.map((m) => ({ key: m.key, label: m.label, unit: m.unit, comparator: m.comparator, hint: m.hint }));
  const isOwner = membership?.role === "owner" || realRole === "admin" || realRole === "superadmin";
  const hasDemo = await prisma.internshipPosting
    .count({ where: { companyId, isDemoSeed: true } })
    .then((n) => n > 0)
    .catch(() => false);

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Reports · Settings"
        icon={<Settings2 size={20} />}
        title="Report settings"
        description="Set hiring targets (OKRs) to drive RAG status, log recruiting costs for cost-per-hire, and control DEI reporting."
      />
      <Link href="/employer/reports" className="no-print inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg transition-colors">
        <ArrowLeft size={13} /> All reports
      </Link>
      <DemoSeederBar hasExistingDemos={hasDemo} />
      <ReportSettingsClient
        metricOptions={metricOptions}
        targets={targets}
        costs={costs}
        deiEnabled={!!company?.deiReportingEnabled}
        isOwner={isOwner}
      />
    </div>
  );
}
