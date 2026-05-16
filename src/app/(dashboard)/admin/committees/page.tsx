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
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users2, CalendarClock, ArrowRight, MessageSquare } from "lucide-react";
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

  // HQP-specific surfaces (queue counts) so the admin spots the
  // workflow shortcuts on first paint.
  const [pendingHqpApps, hqpOpenWindow, openHqpRound] = await Promise.all([
    prisma.hqpMemberApplication.count({ where: { status: "submitted" } }),
    prisma.hqpApplicationWindow.findFirst({
      where: { status: "open", opensAt: { lte: new Date() }, closesAt: { gte: new Date() } },
      select: { id: true, title: true, closesAt: true },
    }),
    prisma.hqpFeedbackRound.findFirst({
      where: { status: "open", opensAt: { lte: new Date() }, closesAt: { gte: new Date() } },
      select: { id: true, title: true, closesAt: true, _count: { select: { responses: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Committees"
        description="Manage Equip Review + HQP committee membership. Members get sidebar shortcuts, a welcome-screen badge, and (for the Equip Review committee) access to the funding review queue without needing an admin role."
      />

      {/* HQP workflow shortcuts — the committee runs an annual
          open call + ongoing review queue + ongoing feedback
          rounds. Surfaced here so an admin lands in the right
          spot without hunting. */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/admin/committees/hqp/applications" className="rounded-2xl border border-line bg-card hover:bg-elevated p-4 surface-shadow transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Users2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg inline-flex items-center gap-2">HQP applications {pendingHqpApps > 0 && <span className="text-[10px] uppercase tracking-wider font-bold bg-rose-100 text-rose-800 ring-1 ring-rose-200 px-1.5 py-0.5 rounded">{pendingHqpApps} pending</span>}</p>
              <p className="text-xs text-muted mt-0.5">Review queue for the HQP Advisory Committee open-call applications.</p>
            </div>
            <ArrowRight size={14} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
        <Link href="/admin/committees/hqp/windows" className="rounded-2xl border border-line bg-card hover:bg-elevated p-4 surface-shadow transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarClock size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">HQP open-call windows{hqpOpenWindow && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded">Open now</span>}</p>
              <p className="text-xs text-muted mt-0.5">
                {hqpOpenWindow ? `${hqpOpenWindow.title} — closes ${new Date(hqpOpenWindow.closesAt).toLocaleDateString()}` : "Schedule the next annual open call."}
              </p>
            </div>
            <ArrowRight size={14} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
        <Link href="/admin/committees/hqp/rounds" className="rounded-2xl border border-line bg-card hover:bg-elevated p-4 surface-shadow transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">HQP feedback rounds{openHqpRound && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-1.5 py-0.5 rounded">Open now</span>}</p>
              <p className="text-xs text-muted mt-0.5">
                {openHqpRound ? `${openHqpRound.title} — ${openHqpRound._count.responses} response${openHqpRound._count.responses === 1 ? "" : "s"} so far` : "Replace docx-by-email feedback with structured rounds."}
              </p>
            </div>
            <ArrowRight size={14} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      <CommitteeMembersClient
        committees={[...COMMITTEES]}
        grouped={grouped}
      />
    </div>
  );
}
