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
import { Users, Users2, Shield, ShieldCheck, Eye, UserCog } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, meetsMinRole } from "@/lib/employer/company";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { Card } from "@/components/ui/Card";
import { MemberList } from "@/components/employer/team/MemberList";
import { PendingInvitesList } from "@/components/employer/team/PendingInvitesList";
import { JoinRequestsPanel } from "@/components/employer/team/JoinRequestsPanel";
import { InviteTeammateModal } from "@/components/employer/team/InviteTeammateModal";
import { TeamDemoSeederBar } from "@/components/employer/team/TeamDemoSeederBar";
import { DEMO_TEAM_EMAILS } from "@/lib/employer/team-demo";

export const dynamic = "force-dynamic";

// Role metadata used in both the header chips and the roles legend.
const ROLES = [
  {
    key:         "owner",
    label:       "Owner",
    icon:        ShieldCheck,
    tone:        "text-violet-700 bg-violet-50 ring-violet-200",
    capability:  "Full admin — change roles, remove members, invite at any tier.",
  },
  {
    key:         "manager",
    label:       "Manager",
    icon:        Shield,
    tone:        "text-brand-700 bg-brand-50 ring-brand-200",
    capability:  "Post roles, review applicants, invite Generalists/Viewers, approve join requests.",
  },
  {
    key:         "generalist",
    label:       "Generalist",
    icon:        UserCog,
    tone:        "text-emerald-700 bg-emerald-50 ring-emerald-200",
    capability:  "Post roles and review applicants. Cannot invite or change roles.",
  },
  {
    key:         "viewer",
    label:       "Viewer",
    icon:        Eye,
    tone:        "text-muted bg-elevated ring-line",
    capability:  "Read-only — can see postings and applicants but cannot take action.",
  },
] as const;

export default async function EmployerTeamPage() {
  const session  = await getSession();
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

  // Resolve (or bootstrap) the company workspace.
  //
  // Priority order:
  //   1. User already has a CompanyMember row → use that company.
  //   2. Admin + existing Company in DB → adopt it, upsert a member row.
  //   3. Admin + no Company in DB at all → auto-create one from their
  //      employer profile (backfill script may not have run yet on this
  //      deployment; this avoids a permanent error screen).
  //   4. Non-admin with no company → show the "not found" error (they
  //      need to go through the normal onboarding / invite flow).
  let companyId: string | null = await getActiveCompanyId(userId).catch(() => null);

  if (!companyId && isAdmin) {
    const existing = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
      select:  { id: true },
    });

    if (existing) {
      // Adopt the existing company. Upsert a member row so this admin
      // can use all management controls (seeder, invite, etc.).
      companyId = existing.id;
      await prisma.companyMember.upsert({
        where:  { companyId_userId: { companyId, userId } },
        create: { companyId, userId, role: "owner", joinedAt: new Date() },
        update: {},
      });
    } else {
      // No companies exist at all — auto-create a workspace using
      // whatever employer profile the admin has (may be empty strings).
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

  // Caller's role on this company.
  // Admins always get owner-tier access regardless of whether they hold
  // an actual CompanyMember row — this lets admins seed demo members,
  // manage invites, and review join requests on any workspace.
  const callerMembership = isAdmin ? null : await prisma.companyMember.findUnique({
    where:  { companyId_userId: { companyId, userId } },
    select: { role: true },
  });
  const callerRole = (
    isAdmin ? "owner" : (callerMembership?.role ?? "viewer")
  ) as "owner" | "manager" | "generalist" | "viewer";
  const canManage  = meetsMinRole(callerRole, "manager");
  const isOwner    = callerRole === "owner";

  const [members, pendingInvites, joinRequests, company, demoUsers] =
    await Promise.all([
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
      // Detect which demo users are already members of this company
      // so the demo seeder bar shows the right button state.
      canManage
        ? prisma.user.findMany({
            where: { email: { in: DEMO_TEAM_EMAILS } },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

  const hasDemoMembers =
    canManage &&
    demoUsers.length > 0 &&
    members.some((m) => demoUsers.some((d) => d.id === m.user.id));

  // Role-count summary — used in the header description.
  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const roleChips = (
    <span className="flex flex-wrap gap-2 mt-1.5">
      {ROLES.filter((r) => (roleCounts[r.key] ?? 0) > 0).map((r) => {
        const Icon = r.icon;
        const count = roleCounts[r.key] ?? 0;
        return (
          <span
            key={r.key}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ring-inset ${r.tone}`}
          >
            <Icon size={11} />
            {count} {r.label}{count !== 1 ? "s" : ""}
          </span>
        );
      })}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* ── Hero ──────────────────────────────────────────── */}
      <DSPageHeader
        eyebrow="Team workspace"
        icon={<Users2 size={20} />}
        title={company?.name ? `${company.name} · Team` : "Your team"}
        description={
          members.length <= 1
            ? "You're the sole member right now. Invite colleagues to share this workspace — each gets a role that controls what they can see and do."
            : `${members.length} member${members.length !== 1 ? "s" : ""} · Manage who has access to this workspace, set their roles, and review pending join requests.`
        }
        aside={members.length > 0 ? roleChips : undefined}
        actions={
          canManage
            ? <InviteTeammateModal companyId={companyId} callerRole={callerRole} />
            : undefined
        }
      />

      {/* ── Roles legend ─────────────────────────────────── */}
      <Card className="px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          What each role can do
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.key} className="flex items-start gap-2.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ring-1 ring-inset shrink-0 mt-0.5 ${r.tone}`}
                >
                  <Icon size={12} />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-fg">{r.label}</span>
                  <span className="text-xs text-muted"> — {r.capability}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Demo seeder — manager+ only ──────────────────── */}
      {canManage && (
        <TeamDemoSeederBar hasDemoMembers={hasDemoMembers} />
      )}

      {/* ── Pending join requests (domain auto-suggest) ── */}
      {canManage && joinRequests.length > 0 && (
        <JoinRequestsPanel
          companyId={companyId}
          requests={joinRequests}
        />
      )}

      {/* ── Member list ─────────────────────────────────── */}
      <MemberList
        companyId={companyId}
        members={members}
        callerId={userId}
        callerRole={callerRole}
        canManage={canManage}
        isOwner={isOwner}
      />

      {/* ── Pending invites ─────────────────────────────── */}
      {canManage && pendingInvites.length > 0 && (
        <PendingInvitesList
          companyId={companyId}
          invites={pendingInvites}
          canManage={canManage}
        />
      )}

      {/* ── Empty state ─────────────────────────────────── */}
      {members.length === 0 && (
        <Card className="px-5 py-12 text-center">
          <Users size={32} className="mx-auto text-muted mb-3" />
          <p className="font-medium text-fg">No team members yet</p>
          <p className="text-sm text-muted mt-1">
            {canManage
              ? "Invite your first teammate to get started, or use the demo seeder above to preview how the page looks with people in it."
              : "Your team will appear here once members are added."}
          </p>
        </Card>
      )}
    </div>
  );
}
