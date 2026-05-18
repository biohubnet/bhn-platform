/**
 * /admin/committees/equip-review — EQUIP Review Committee
 * management. Previously this content was bundled at /admin/committees
 * alongside HQP; split into its own page so the entry point can live
 * under the EQUIP admin nav sub-group.
 *
 * The committee's workflow surface IS the broader EQUIP queue
 * (`/admin/equip`) — members already get queue access via the
 * `grantsEquipReview` flag in the registry. This page is the
 * roster + a shortcut into the queue.
 *
 * Auth: admin only.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCommitteeMeta } from "@/lib/committees/registry";
import { CommitteeMembersClient } from "@/components/admin/CommitteeMembersClient";

export const dynamic = "force-dynamic";

export default async function AdminEquipReviewCommitteePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const equipReviewMeta = getCommitteeMeta("equip_review");

  const members = await prisma.committeeMembership.findMany({
    where: { committee: "equip_review" },
    orderBy: [{ active: "desc" }, { joinedAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, role: true, organization: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={equipReviewMeta.name}
        description="Manage EQUIP Review Committee membership. Members claim, approve, and fund applications via the EQUIP review queue without needing the admin role."
      />

      {/* Quick link into the EQUIP queue — committee members
          land here for roster work but typically need a fast path
          to the review surface. */}
      <Link
        href="/admin/equip"
        className="block rounded-2xl border border-line bg-card hover:bg-elevated p-4 surface-shadow transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Rocket size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">EQUIP review queue</p>
            <p className="text-xs text-muted mt-0.5">Claim, approve / reject, and fund VentureConnect + VentureLift applications.</p>
          </div>
          <ArrowRight size={14} className="text-muted shrink-0 mt-1" />
        </div>
      </Link>

      <CommitteeMembersClient
        committees={[equipReviewMeta]}
        grouped={{ equip_review: members }}
      />
    </div>
  );
}
