/**
 * /employer/team — company team management page.
 *
 * Shows all members (role chips, title, last-seen), pending join
 * requests (domain-match auto-suggest flow), and pending invites.
 *
 * Actions available by role:
 *   Owner+   — change any member's role, remove members, approve/
 *              decline join requests, invite at any tier.
 *   Manager+ — invite generalists/viewers, approve/decline join
 *              requests.
 *   Viewer   — read-only list.
 */

import { redirect } from "next/navigation";
import { Users, UserPlus, Clock, Shield, ShieldCheck, Eye } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, meetsMinRole } from "@/lib/employer/company";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { MemberList } from "@/components/employer/team/MemberList";
import { PendingInvitesList } from "@/components/employer/team/PendingInvitesList";
import { JoinRequestsPanel } from "@/components/employer/team/JoinRequestsPanel";
import { InviteTeammateModal } from "@/components/employer/team/InviteTeammateModal";

export const dynamic = "force-dynamic";

const ROLE_ICON = {
  owner:      ShieldCheck,
  manager:    Shield,
  generalist: Users,
  viewer:     Eye,
};

export default async function EmployerTeamPage() {
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

  const companyId = await getActiveCompanyId(userId);
  if (!companyId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">
          No company workspace found. Contact support if this looks wrong.
        </p>
      </div>
    );
  }

  // Caller's role on this company.
  const callerMembership = await prisma.companyMember.findUnique({
    where:  { companyId_userId: { companyId, userId } },
    select: { role: true },
  });
  const callerRole = (callerMembership?.role ?? "viewer") as "owner" | "manager" | "generalist" | "viewer";
  const canManage  = meetsMinRole(callerRole, "manager");
  const isOwner    = callerRole === "owner";

  const [members, pendingInvites, joinRequests, company] = await Promise.all([
    prisma.companyMember.findMany({
      where:   { companyId },
      select:  {
        id:         true,
        role:       true,
        title:      true,
        joinedAt:   true,
        lastSeenAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
    canManage
      ? prisma.companyInvite.findMany({
          where:   { companyId, status: "pending", expiresAt: { gt: new Date() } },
          select:  {
            id:        true,
            email:     true,
            role:      true,
            title:     true,
            createdAt: true,
            expiresAt: true,
            invitedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.companyJoinRequest.findMany({
          where:   { companyId, status: "pending" },
          select:  {
            id:            true,
            suggestedRole: true,
            note:          true,
            createdAt:     true,
            requester: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.company.findUnique({
      where:  { id: companyId },
      select: { name: true },
    }),
  ]);

  // Role-count summary for the header chip.
  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${company?.name ?? "Team"} · Members`}
        description={
          <span className="flex flex-wrap gap-2 mt-1">
            {Object.entries(roleCounts).map(([role, count]) => {
              const Icon = ROLE_ICON[role as keyof typeof ROLE_ICON] ?? Users;
              return (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted bg-elevated px-2 py-0.5 rounded-full ring-1 ring-inset ring-line"
                >
                  <Icon size={11} />
                  {count} {role}{count !== 1 ? "s" : ""}
                </span>
              );
            })}
          </span>
        }
        actions={
          canManage
            ? <InviteTeammateModal companyId={companyId} callerRole={callerRole} />
            : null
        }
      />

      {/* Pending join requests (domain auto-suggest) */}
      {canManage && joinRequests.length > 0 && (
        <JoinRequestsPanel
          companyId={companyId}
          requests={joinRequests}
        />
      )}

      {/* Member list */}
      <MemberList
        companyId={companyId}
        members={members}
        callerId={userId}
        callerRole={callerRole}
        canManage={canManage}
        isOwner={isOwner}
      />

      {/* Pending invites */}
      {canManage && pendingInvites.length > 0 && (
        <PendingInvitesList
          companyId={companyId}
          invites={pendingInvites}
          canManage={canManage}
        />
      )}

      {/* Empty state for viewer */}
      {members.length === 0 && (
        <Card className="px-5 py-12 text-center">
          <Users size={32} className="mx-auto text-muted mb-3" />
          <p className="font-medium text-fg">No team members yet</p>
          <p className="text-sm text-muted mt-1">
            {canManage ? "Invite your first teammate to get started." : "Your team will appear here once members are added."}
          </p>
        </Card>
      )}
    </div>
  );
}
