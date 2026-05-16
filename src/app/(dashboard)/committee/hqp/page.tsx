/**
 * /committee/hqp — landing surface for committee members.
 *
 * Pulls everything the member needs in one scroll: open feedback
 * rounds, upcoming meetings, their open action items, the member
 * directory, and a COI disclosure panel. Admins land here too;
 * they see the same content plus their admin-side shortcuts via
 * /admin/committees.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Award, ArrowRight, MessageSquare, CalendarClock,
  ListChecks, Users, AlertCircle, ExternalLink,
} from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpCoiPanel } from "@/components/committee/HqpCoiPanel";

export const dynamic = "force-dynamic";

export default async function HqpCommitteePage() {
  const session = await requireCommitteeOrAdmin(["hqp"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";

  const now = new Date();

  const [openRounds, upcomingMeetings, myActionItems, members, coi] = await Promise.all([
    prisma.hqpFeedbackRound.findMany({
      where: { status: "open", opensAt: { lte: now }, closesAt: { gte: now } },
      orderBy: { closesAt: "asc" },
    }),
    prisma.hqpMeeting.findMany({
      where: { scheduledAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) }, status: { in: ["scheduled", "held"] } },
      orderBy: { scheduledAt: "asc" },
      take: 4,
      include: { _count: { select: { attendance: true } } },
    }),
    prisma.hqpActionItem.findMany({
      where: { assignedToId: userId, status: { in: ["open", "in_progress"] } },
      orderBy: { dueOn: "asc" },
      include: { meeting: { select: { id: true, title: true } } },
    }),
    prisma.committeeMembership.findMany({
      where: { committee: "hqp", active: true },
      include: { user: { select: { id: true, name: true, email: true, organization: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.hqpCoiDisclosure.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { declaredAt: "desc" }],
    }),
  ]);

  const myResponses = openRounds.length > 0
    ? await prisma.hqpFeedbackResponse.findMany({
        where: { roundId: { in: openRounds.map((r) => r.id) }, userId },
        select: { roundId: true, status: true },
      })
    : [];
  const myStatusByRound = new Map(myResponses.map((r) => [r.roundId, r.status]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="HQP Committee"
        description="One-stop coordination surface for the Highly Qualified Personnel committee — feedback rounds, meetings, action items, the member directory, and your COI disclosures."
      />

      {/* Open feedback rounds */}
      {openRounds.length > 0 && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/30 p-5 surface-shadow space-y-3">
          <header className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700 inline-flex items-center gap-1.5">
              <MessageSquare size={11} /> Open feedback rounds — your input is requested
            </p>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-violet-100 text-violet-800 ring-1 ring-violet-200 px-1.5 py-0.5 rounded">
              {openRounds.length}
            </span>
          </header>
          <ul className="space-y-2">
            {openRounds.map((r) => {
              const myStatus = myStatusByRound.get(r.id);
              return (
                <li key={r.id}>
                  <Link href={`/committee/hqp/feedback/${r.id}`} className="block rounded-xl border border-line bg-card hover:bg-elevated p-3 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg">{r.title}</p>
                        {r.description && <p className="text-[11px] text-muted line-clamp-2">{r.description}</p>}
                        <p className="text-[10px] text-subtle font-mono mt-1">
                          Closes {r.closesAt.toLocaleString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      {myStatus === "submitted" && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded shrink-0">Submitted</span>}
                      {myStatus === "draft"     && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100   text-amber-800   ring-1 ring-amber-200   px-1.5 py-0.5 rounded shrink-0">Draft</span>}
                      {!myStatus                && <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100    text-rose-800    ring-1 ring-rose-200    px-1.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1"><AlertCircle size={9} /> Not started</span>}
                      <ArrowRight size={13} className="text-muted shrink-0 mt-2" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Upcoming meetings */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <header className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <CalendarClock size={11} /> Upcoming + recent meetings
          </p>
        </header>
        {upcomingMeetings.length === 0 ? (
          <p className="text-xs text-subtle italic">No meetings on the calendar yet.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingMeetings.map((m) => (
              <li key={m.id}>
                <Link href={`/committee/hqp/meetings/${m.id}`} className="block rounded-xl border border-line bg-card-solid hover:bg-elevated p-3 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarClock size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-fg">{m.title}</p>
                      <p className="text-[11px] text-muted">
                        {new Date(m.scheduledAt).toLocaleString("en-US", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}{" · "}
                        {m.durationMin} min · {m._count.attendance} invited
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-muted shrink-0 mt-2" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My open action items */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <header className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <ListChecks size={11} /> My open action items
          </p>
          {myActionItems.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-1.5 py-0.5 rounded">{myActionItems.length}</span>
          )}
        </header>
        {myActionItems.length === 0 ? (
          <p className="text-xs text-subtle italic">Nothing assigned to you right now.</p>
        ) : (
          <ul className="space-y-1.5">
            {myActionItems.map((a) => (
              <li key={a.id}>
                <Link href={a.meetingId ? `/committee/hqp/meetings/${a.meetingId}` : "/committee/hqp"} className="block rounded-xl border border-line bg-card-solid hover:bg-elevated p-3 transition-colors">
                  <p className="text-sm font-semibold text-fg">{a.title}</p>
                  {a.description && <p className="text-[11px] text-muted line-clamp-1 mt-0.5">{a.description}</p>}
                  <p className="text-[10px] text-subtle font-mono mt-1">
                    Status: <strong>{a.status === "in_progress" ? "in progress" : a.status}</strong>
                    {a.dueOn && ` · due ${new Date(a.dueOn).toLocaleDateString()}`}
                    {a.meeting && ` · from “${a.meeting.title}”`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Member directory */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <header className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <Users size={11} /> Committee members
          </p>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-elevated text-muted ring-1 ring-line px-1.5 py-0.5 rounded">{members.length}</span>
        </header>
        {members.length === 0 ? (
          <p className="text-xs text-subtle italic">No active members yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {members.map((m) => (
              <li key={m.id} className="rounded-xl bg-elevated/40 border border-line p-3">
                <p className="text-sm font-bold text-fg truncate">{m.user.name ?? m.user.email}</p>
                <p className="text-[11px] text-muted truncate">{m.user.organization ?? "—"}</p>
                <p className="text-[10px] text-subtle mt-1">Since {new Date(m.joinedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COI panel */}
      <HqpCoiPanel
        disclosures={coi.map((d) => ({
          id: d.id,
          scope: d.scope,
          description: d.description,
          active: d.active,
          declaredAt: d.declaredAt.toISOString(),
          resolvedAt: d.resolvedAt?.toISOString() ?? null,
        }))}
      />

      {/* Membership banner */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg">You are on the HQP committee</h2>
            <p className="text-sm text-muted mt-1 max-w-prose">
              Membership grants access to this page + a welcome-screen badge identifying your role. Members are expected to spend ~12 h total over the 1-year term per the{" "}
              <Link href="/files/HQP%20Advisory%20Committee%20Charter.pdf" className="text-violet-700 underline inline-flex items-center gap-1">Charter <ExternalLink size={11} /></Link>.
            </p>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-subtle leading-snug">
        Know someone who&apos;d be a great fit? Share <Link href="/committee/hqp/apply" className="text-violet-700 underline font-semibold">/committee/hqp/apply</Link> — the form opens when an admin schedules the annual call.
      </p>
    </div>
  );
}
