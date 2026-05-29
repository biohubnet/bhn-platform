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
import { resolveWorkspaceCompanyId } from "@/lib/employer/admin-preview";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { TemplatesClient } from "@/components/employer/templates/TemplatesClient";
import { EmployerEntityDemoBar } from "@/components/employer/EmployerEntityDemoBar";

export const dynamic = "force-dynamic";

export default async function EmployerTemplatesPage() {
  try {
    return await renderTemplatesPage();
  } catch (err) {
    // Last-resort guard: log the real error so it appears in Vercel
    // function logs (visible at vercel.com → project → Logs) while
    // showing a safe empty state to the user.
    console.error("[EmployerTemplatesPage] unexpected error:", err);
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          Templates are temporarily unavailable. Please try again in a moment.
        </p>
      </div>
    );
  }
}

async function renderTemplatesPage() {
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
  // exact company the demo-template seed writes into — including for
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
    }).catch(() => [] as Array<{
      id: string; name: string; kind: string; subject: string;
      body: string; isStarter: boolean; createdAt: Date;
    }>),
    isAdmin
      ? Promise.resolve(null)
      : prisma.companyMember.findUnique({
          where:  { companyId_userId: { companyId, userId } },
          select: { role: true },
        }).catch(() => null),
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
        entityNoun="demo template"
      />
      <TemplatesClient
        companyId={companyId}
        templates={serialisedTemplates}
        canEdit={canEdit}
      />
    </div>
  );
}
