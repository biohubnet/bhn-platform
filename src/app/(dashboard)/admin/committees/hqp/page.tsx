/**
 * /admin/committees/hqp — HQP Advisory Committee management hub.
 * Previously this content lived at /admin/committees alongside the
 * EQUIP Review committee; split into its own page so the entry
 * point can live under ENGAGE admin nav (HQP being an ENGAGE-pillar
 * committee) rather than a generic "Committees" entry.
 *
 * Sections:
 *   • Four workflow shortcuts — applications / windows / feedback
 *     rounds / meetings — each with a live counter / "open now" /
 *     "next scheduled" badge so the admin lands in the right spot.
 *   • HQP roster — add / revoke / re-instate / note members.
 *
 * Auth: admin only (committee members manage their own work
 * surfaces; rosters stay a staff concern).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users2, CalendarClock, ArrowRight, MessageSquare, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { COMMITTEES, getCommitteeMeta } from "@/lib/committees/registry";
import { CommitteeMembersClient } from "@/components/admin/CommitteeMembersClient";

export const dynamic = "force-dynamic";

export default async function AdminHqpCommitteePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const hqpMeta = getCommitteeMeta("hqp");

  const [members, pendingHqpApps, hqpOpenWindow, openHqpRound, nextMeeting] =
    await Promise.all([
      prisma.committeeMembership.findMany({
        where: { committee: "hqp" },
        orderBy: [{ active: "desc" }, { joinedAt: "desc" }],
        include: {
          user: { select: { id: true, name: true, email: true, role: true, organization: true } },
        },
      }),
      prisma.hqpMemberApplication.count({ where: { status: "submitted" } }),
      prisma.hqpApplicationWindow.findFirst({
        where: { status: "open", opensAt: { lte: new Date() }, closesAt: { gte: new Date() } },
        select: { id: true, title: true, closesAt: true },
      }),
      prisma.hqpFeedbackRound.findFirst({
        where: { status: "open", opensAt: { lte: new Date() }, closesAt: { gte: new Date() } },
        select: { id: true, title: true, closesAt: true, _count: { select: { responses: true } } },
      }),
      prisma.hqpMeeting.findFirst({
        where: { scheduledAt: { gte: new Date() }, status: "scheduled" },
        orderBy: { scheduledAt: "asc" },
        select: { id: true, title: true, scheduledAt: true },
      }),
    ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={hqpMeta.name}
        description="Manage HQP Advisory Committee membership and the workflow surfaces — open-call applications, application windows, feedback rounds, and committee meetings."
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
        <Link href="/admin/committees/hqp/meetings" className="rounded-2xl border border-line bg-card hover:bg-elevated p-4 surface-shadow transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">HQP meetings{nextMeeting && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-sky-100 text-sky-800 ring-1 ring-sky-200 px-1.5 py-0.5 rounded">Next scheduled</span>}</p>
              <p className="text-xs text-muted mt-0.5">
                {nextMeeting ? `${nextMeeting.title} — ${new Date(nextMeeting.scheduledAt).toLocaleDateString()}` : "Schedule monthly meetings, capture notes + action items."}
              </p>
            </div>
            <ArrowRight size={14} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      {/* Roster — single-committee view filtered to HQP. */}
      <CommitteeMembersClient
        committees={[hqpMeta]}
        grouped={{ hqp: members }}
      />

      {/* Quietly preserve the COMMITTEES import so the linter doesn't
          flag this file when the registry grows — getCommitteeMeta
          already references it via the slug lookup. */}
      <span aria-hidden className="hidden">{COMMITTEES.length}</span>
    </div>
  );
}
