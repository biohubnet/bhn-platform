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
import { getActiveCompanyId } from "@/lib/employer/company";
import { ensureAdminPreviewCompany } from "@/lib/employer/admin-preview";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { CalendarClient } from "@/components/employer/calendar/CalendarClient";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";

export const dynamic = "force-dynamic";

export default async function EmployerCalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId   = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin  = userRole === "admin" || userRole === "superadmin";

  if (userRole !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This page is for employer accounts.</p>
      </div>
    );
  }

  // ── Resolve companyId ──────────────────────────────────────────
  // Real employers go through their CompanyMember row. Admins get a
  // PRIVATE single-member preview workspace via ensureAdminPreviewCompany
  // — see src/lib/employer/admin-preview.ts for why this matters
  // (the old "auto-add to the FIRST company" bootstrap leaked data
  // between admins; every superadmin ended up sharing Cytiva).
  let companyId: string | null = isAdmin
    ? await ensureAdminPreviewCompany(userId).catch(() => null)
    : await getActiveCompanyId(userId).catch(() => null);

  if (!companyId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          No company workspace found. Contact support if this looks wrong.
        </p>
      </div>
    );
  }

  const hasDemoPostings =
    (await prisma.internshipPosting.count({
      where: { createdById: userId, isDemoSeed: true },
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
