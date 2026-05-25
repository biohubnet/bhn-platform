/**
 * /employer/templates — manage email templates for each hiring stage.
 *
 * Gated to employer or admin/superadmin. Owners and managers can
 * create, edit, and delete templates; generalists and viewers get a
 * read-only view.
 */

import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/employer/company";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { TemplatesClient } from "@/components/employer/templates/TemplatesClient";
import { EmployerEntityDemoBar } from "@/components/employer/EmployerEntityDemoBar";

export const dynamic = "force-dynamic";

export default async function EmployerTemplatesPage() {
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

  // ── Resolve companyId (3-tier fallback from team/page.tsx) ────────
  let companyId: string | null = await getActiveCompanyId(userId).catch(() => null);

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

  // ── Fetch templates + caller membership ─────────────────────────
  const [templates, callerMembership] = await Promise.all([
    prisma.emailTemplate.findMany({
      where:   { companyId },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      select: {
        id:        true,
        name:      true,
        kind:      true,
        subject:   true,
        body:      true,
        isStarter: true,
        createdAt: true,
      },
    }),
    isAdmin
      ? Promise.resolve(null)
      : prisma.companyMember.findUnique({
          where:  { companyId_userId: { companyId, userId } },
          select: { role: true },
        }),
  ]);

  const callerRole = (
    isAdmin ? "owner" : (callerMembership?.role ?? "viewer")
  ) as "owner" | "manager" | "generalist" | "viewer";

  const canEdit = callerRole === "owner" || callerRole === "manager";

  // Serialise dates
  const serialisedTemplates = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const hasDemoTemplates = templates.some((t) => t.name.startsWith("[Demo] "));

  return (
    <div className="space-y-5">
      <DSPageHeader
        eyebrow="Communication"
        icon={<Mail size={20} />}
        title="Email templates"
        description="Manage the messages sent to candidates at each hiring stage. Personalise with merge variables like {{candidateFirstName}} and {{postingTitle}}."
      />
      <EmployerEntityDemoBar
        endpoint="/api/employer/demo/templates"
        description="Populate your workspace with five example templates — one per hiring stage. Edit or delete them any time."
        hasExistingDemos={hasDemoTemplates}
        seedSuccessFn={(j) =>
          `Created ${j.created} demo template${j.created === 1 ? "" : "s"}.`
        }
      />
      <TemplatesClient
        companyId={companyId}
        templates={serialisedTemplates}
        canEdit={canEdit}
      />
    </div>
  );
}
