/**
 * Shared shell for a single report page: hero + period picker + CSV
 * download + back-to-hub link. Plus the standard access-error card.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";
import { PeriodPicker } from "./PeriodPicker";

export async function ReportFrame({
  eyebrow,
  icon,
  title,
  description,
  periodKey,
  csvHref,
  companyId,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  description: string;
  periodKey: string;
  csvHref?: string;
  /** Company whose demo-seed state drives the seed/clear bar. */
  companyId: string;
  children: ReactNode;
}) {
  const hasDemo = await prisma.internshipPosting
    .count({ where: { companyId, isDemoSeed: true } })
    .then((n) => n > 0)
    .catch(() => false);
  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow={eyebrow}
        icon={icon}
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker current={periodKey} />
            {csvHref && (
              <a
                href={csvHref}
                download
                className="no-print inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg ring-1 ring-inset ring-line bg-card hover:bg-elevated text-fg transition-colors"
              >
                <Download size={13} /> CSV
              </a>
            )}
          </div>
        }
      />
      <Link
        href="/employer/reports"
        className="no-print inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={13} /> All reports
      </Link>
      <DemoSeederBar hasExistingDemos={hasDemo} />
      {children}
    </div>
  );
}

export function ReportAccessError({ reason }: { reason: "forbidden" | "no_company" }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-12 text-center">
      <p className="font-medium text-muted">
        {reason === "forbidden"
          ? "This page is for employer accounts."
          : "No company workspace found. Contact support if this looks wrong."}
      </p>
    </div>
  );
}
