/**
 * /employer/calendar — interview calendar week view.
 *
 * Server component: resolves companyId and passes it to the client.
 * Gated to employer or admin.
 */

import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceCompanyId } from "@/lib/employer/admin-preview";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { CalendarClient } from "@/components/employer/calendar/CalendarClient";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";

export const dynamic = "force-dynamic";

export default async function EmployerCalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId   = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole ?? userRole;
  const isAdmin  = userRole === "admin" || userRole === "superadmin";

  if (userRole !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This page is for employer accounts.</p>
      </div>
    );
  }

  // ── Resolve companyId ──────────────────────────────────────────
  // Shared resolver (keyed on REAL role) so this read lands on the
  // exact company the demo seed writes into — including for
  // superadmins using view-as-employer. See resolveWorkspaceCompanyId.
  const companyId: string | null = await resolveWorkspaceCompanyId(userId, realRole).catch(() => null);

  if (!companyId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          No company workspace found. Contact support if this looks wrong.
        </p>
      </div>
    );
  }

  // Check by companyId — same scope the calendar reads — so the
  // "clear demo" affordance reflects what's actually shown.
  const hasDemoPostings =
    (await prisma.internshipPosting.count({
      where: { companyId, isDemoSeed: true },
    }).catch(() => 0)) > 0;

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Schedule"
        icon={<CalendarDays size={20} />}
        title="Interview calendar"
        description="All upcoming interviews across your postings. Click any event to jump to the candidate in your workspace."
      />
      <DemoSeederBar hasExistingDemos={hasDemoPostings} />
      <CalendarClient companyId={companyId} />
    </div>
  );
}
