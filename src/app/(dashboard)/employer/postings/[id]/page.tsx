import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, Users2, ArrowRight, Inbox, Activity, Sparkles,
  CheckCircle2, XCircle, Layers,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostingEditor } from "@/components/employer/PostingEditor";

/**
 * /employer/postings/[id] — the canonical posting page.
 *
 * Edit lives here (instead of on the listing) so the listing can be
 * a fast queue view for triage + bulk actions, and the per-posting
 * page is the place to do full edits. Both employers and admins
 * land here; non-owners get a 404.
 */
export default async function EmployerPostingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const userId = (session.user as { id?: string }).id ?? null;
  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const { id } = await params;
  const posting = await prisma.internshipPosting.findUnique({ where: { id } });
  if (!posting) notFound();

  // Ownership gate. Non-admin employers can only manage their own
  // postings; admins see everything.
  if (!isAdmin && posting.createdById !== userId) notFound();

  // Applicants summary — total + stage breakdown so the spotlight
  // panel can show where the pipeline is sitting at a glance. We
  // bucket the 9 canonical stages into 4 broad groups for the chip
  // strip; the per-stage detail lives on the Kanban view.
  const grouped = await prisma.applicationStatus.groupBy({
    by: ["status"],
    where: { postingId: id },
    _count: { status: true },
  });
  const countByStatus: Record<string, number> = {};
  for (const g of grouped) countByStatus[g.status] = g._count.status;
  const applicantCount = grouped.reduce((sum, g) => sum + g._count.status, 0);
  // "New" = stage="new" (just arrived, awaiting triage). This is the
  // urgent bucket — fresh CVs the recruiter hasn't touched.
  const newCount = countByStatus.new ?? 0;
  const inProgressCount =
    (countByStatus.reviewing ?? 0) +
    (countByStatus.shortlisted ?? 0) +
    (countByStatus.interview_scheduled ?? 0) +
    (countByStatus.interviewed ?? 0) +
    (countByStatus.offer ?? 0);
  const hiredCount = countByStatus.hired ?? 0;
  const closedCount = (countByStatus.passed ?? 0) + (countByStatus.withdrawn ?? 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/employer/postings"
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> All postings
        </Link>
        <h1 className="text-2xl font-bold text-fg tracking-tight">{posting.title}</h1>
        <p className="text-sm text-muted mt-0.5">
          Posted {posting.createdAt.toLocaleDateString()} · last edited {posting.updatedAt.toLocaleDateString()}
        </p>
      </div>

      {/* ── Applicants spotlight ──────────────────────────────────
          Promoted from a small button next to the title to a
          prominent panel above the editor — applicant review is
          why this page is visited. Big total + stage breakdown +
          two equal-weight CTAs (review the list, open the kanban).
          The "New" chip turns red-amber when there's anything in
          the triage queue. */}
      <section
        className="relative overflow-hidden rounded-3xl border border-line bg-card"
        style={{
          boxShadow:
            "0 30px 60px -22px rgba(15, 23, 42, 0.22), 0 14px 28px -10px rgba(15, 23, 42, 0.10)",
        }}
      >
        {/* Spotlight gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 15% 20%, rgba(94, 143, 247, 0.18), transparent 60%)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 92% 88%, rgba(16, 185, 129, 0.12), transparent 65%)" }}
          aria-hidden
        />

        <div className="relative p-6 md:p-7">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Icon + count */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl bg-brand-500/30 blur-2xl opacity-70" aria-hidden />
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-2xl ring-1 ring-white/40">
                  <Users2 size={32} strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700">
                  Applicants
                </p>
                <p className="text-5xl md:text-6xl font-black tabular-nums leading-none tracking-tight text-fg mt-1">
                  {applicantCount}
                </p>
                <p className="text-xs text-muted mt-1">
                  {applicantCount === 1 ? "candidate" : "candidates"} on this posting
                </p>
              </div>
            </div>

            {/* Stage breakdown — four chips */}
            <div className="flex-1 min-w-[240px]">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
                Pipeline at a glance
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StageChip
                  icon={Inbox}
                  label="New"
                  count={newCount}
                  tone={newCount > 0 ? "rose" : "muted"}
                  help="Awaiting triage"
                />
                <StageChip
                  icon={Activity}
                  label="In progress"
                  count={inProgressCount}
                  tone="brand"
                  help="Reviewing → Offer"
                />
                <StageChip
                  icon={CheckCircle2}
                  label="Hired"
                  count={hiredCount}
                  tone="emerald"
                />
                <StageChip
                  icon={XCircle}
                  label="Closed"
                  count={closedCount}
                  tone="muted"
                  help="Passed / withdrawn"
                />
              </div>
            </div>
          </div>

          {/* CTAs — equal weight, the two surfaces recruiters
              actually want from this page. */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/employer/postings/${id}/applicants`}
              className="flex-1 sm:flex-initial min-w-[200px] inline-flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/30 ring-1 ring-white/30 hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <Users2 size={16} />
                Review applicants
                {newCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-white text-brand-700 text-[10px] font-bold tabular-nums">
                    {newCount} new
                  </span>
                )}
              </span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href={`/employer/postings/${id}/pipeline`}
              className="flex-1 sm:flex-initial min-w-[200px] inline-flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-card text-fg font-bold text-sm ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-elevated transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <Layers size={16} className="text-brand-600" />
                Open pipeline
              </span>
              <ArrowRight size={14} className="text-muted" />
            </Link>
            {applicantCount === 0 && (
              <p className="text-xs text-muted inline-flex items-center gap-1.5 ml-1">
                <Sparkles size={11} />
                No applicants yet — they&apos;ll surface here once trainees apply.
              </p>
            )}
          </div>
        </div>
      </section>

      <PostingEditor
        posting={{
          id: posting.id,
          companyName: posting.companyName,
          website: posting.website,
          title: posting.title,
          duration: posting.duration,
          hours: posting.hours,
          location: posting.location,
          type: posting.type,
          compensation: posting.compensation,
          deadline: posting.deadline?.toISOString() ?? null,
          keySkills: posting.keySkills,
          positionDetails: posting.positionDetails,
          status: posting.status,
          contactEmail: posting.contactEmail,
          contactName: posting.contactName,
          contactPhone: posting.contactPhone,
        }}
      />
    </div>
  );
}

/** One pipeline-stage chip inside the Applicants spotlight. Hairline-
 *  bordered cell, big tone-coloured number on top, label below. The
 *  rose tone signals "needs triage" so the eye lands on New first. */
function StageChip({
  icon: Icon,
  label,
  count,
  tone,
  help,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  tone: "rose" | "brand" | "emerald" | "muted";
  help?: string;
}) {
  const tones: Record<typeof tone, { icon: string; num: string; ring: string; bg: string }> = {
    rose:    { icon: "text-rose-700",    num: "text-rose-700",    ring: "ring-rose-200",    bg: "bg-rose-50/70" },
    brand:   { icon: "text-brand-700",   num: "text-brand-700",   ring: "ring-brand-200",   bg: "bg-brand-50/70" },
    emerald: { icon: "text-emerald-700", num: "text-emerald-700", ring: "ring-emerald-200", bg: "bg-emerald-50/60" },
    muted:   { icon: "text-subtle",      num: "text-fg",          ring: "ring-line",        bg: "bg-elevated/50" },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-xl ring-1 ring-inset ${t.ring} ${t.bg} px-3 py-2.5`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
        <Icon size={11} className={t.icon} /> {label}
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none mt-1 ${t.num}`}>
        {count}
      </p>
      {help && <p className="text-[10px] text-muted mt-1 truncate">{help}</p>}
    </div>
  );
}
