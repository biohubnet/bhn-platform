/**
 * /committee/hqp — HQP committee coordination surface (stub).
 *
 * Members only — gated via requireCommitteeOrAdmin(["hqp"]). The
 * dashboard itself is intentionally lightweight at launch: this
 * page exists so the sidebar shortcut + welcome-screen badge have
 * a real destination, and so the access guard is in place when
 * the real HQP dashboards (trainee-quality reports, partner-
 * network analytics) land.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, ArrowRight, ClipboardList, MessageSquare, AlertCircle } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function HqpCommitteePage() {
  const session = await requireCommitteeOrAdmin(["hqp"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";

  // Open rounds the user can still respond to. Closed rounds are
  // visible to admins via /admin/committees/hqp/rounds; members
  // see only what they can act on.
  const now = new Date();
  const openRounds = await prisma.hqpFeedbackRound.findMany({
    where: { status: "open", opensAt: { lte: now }, closesAt: { gte: now } },
    orderBy: { closesAt: "asc" },
  });
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
        description="Coordination surface for the Highly Qualified Personnel committee. Feedback rounds + member directory land here; partner-network analytics is in flight."
      />

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
              const submitted = myStatus === "submitted";
              const inDraft = myStatus === "draft";
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
                      {submitted && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded shrink-0">Submitted</span>}
                      {inDraft   && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100   text-amber-800   ring-1 ring-amber-200   px-1.5 py-0.5 rounded shrink-0">Draft</span>}
                      {!myStatus && <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100    text-rose-800    ring-1 ring-rose-200    px-1.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1"><AlertCircle size={9} /> Not started</span>}
                      <ArrowRight size={13} className="text-muted shrink-0 mt-2" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg">You are on the HQP committee</h2>
            <p className="text-sm text-muted mt-1 max-w-prose">
              Membership grants access to this page + a welcome-screen badge identifying your role. Surfaces in
              the works: partner-network HQP counts, weekly trainee-quality digest, and a per-cohort review
              queue.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/analytics"
          className="block rounded-2xl border border-line bg-card p-5 hover:border-line-strong transition-colors surface-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">Platform analytics</p>
              <p className="text-xs text-muted mt-0.5">User growth, course completions, role distribution — the existing admin analytics dashboard.</p>
            </div>
            <ArrowRight size={16} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="block rounded-2xl border border-line bg-card p-5 hover:border-line-strong transition-colors surface-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">Trainee directory</p>
              <p className="text-xs text-muted mt-0.5">All trainees registered on the platform. Filter by institution + role. Admin-tier link.</p>
            </div>
            <ArrowRight size={16} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      <p className="text-[11px] text-subtle leading-snug">
        Know someone who&apos;d be a great fit? Share <Link href="/committee/hqp/apply" className="text-violet-700 underline font-semibold">/committee/hqp/apply</Link> — the form opens when an admin schedules the annual call.
      </p>
    </div>
  );
}
