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
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { CalendarClient } from "@/components/employer/calendar/CalendarClient";

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

  // ── Resolve companyId (3-tier fallback) ────────────────────────
  let companyId: string | null = isAdmin ? null : await getActiveCompanyId(userId);

  if (!companyId && isAdmin) {
    const existing = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
      select:  { id: true },
    });
    if (existing) {
      companyId = existing.id;
      await prisma.companyMember.upsert({
        where:  { companyId_userId: { companyId, userId } },
        create: { companyId, userId, role: "owner", joinedAt: new Date() },
        update: {},
      });
    } else {
      const profile = await prisma.user.findUnique({
        where:  { id: userId },
        select: { employerCompany: true },
      });
      const newCo = await prisma.company.create({
        data: {
          name:    profile?.employerCompany?.trim() || "My Company",
          members: {
            create: { userId, role: "owner", joinedAt: new Date() },
          },
        },
        select: { id: true },
      });
      companyId = newCo.id;
    }
  }

  if (!companyId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          No company workspace found. Contact support if this looks wrong.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Schedule"
        icon={<CalendarDays size={20} />}
        title="Interview calendar"
        description="All upcoming interviews across your postings. Click any event to jump to the candidate in your workspace."
      />
      <CalendarClient companyId={companyId} />
    </div>
  );
}
