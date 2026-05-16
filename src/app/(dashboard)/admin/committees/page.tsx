/**
 * /admin/committees — manage Equip Review + HQP (and future)
 * committee memberships.
 *
 * Lists each committee in the registry as its own section. Each
 * section embeds an add-member form (email + optional note) and
 * a revoke / reinstate / edit-note action per row.
 *
 * Auth: admin only (committee members themselves don't manage
 * the rosters — that stays a platform-staff concern).
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { COMMITTEES } from "@/lib/committees/registry";
import { CommitteeMembersClient } from "@/components/admin/CommitteeMembersClient";

export const dynamic = "force-dynamic";

export default async function AdminCommitteesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Same shape that GET /api/admin/committees returns. We just
  // call Prisma directly here since we're already on the server
  // — saves a round-trip.
  const rows = await prisma.committeeMembership.findMany({
    orderBy: [{ committee: "asc" }, { active: "desc" }, { joinedAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, role: true, organization: true } },
    },
  });

  const grouped = COMMITTEES.reduce<Record<string, typeof rows>>((acc, c) => {
    acc[c.slug] = rows.filter((r) => r.committee === c.slug);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Committees"
        description="Manage Equip Review + HQP committee membership. Members get sidebar shortcuts, a welcome-screen badge, and (for the Equip Review committee) access to the funding review queue without needing an admin role."
      />
      <CommitteeMembersClient
        committees={[...COMMITTEES]}
        grouped={grouped}
      />
    </div>
  );
}
