import Link from "next/link";
import {
  ArrowLeft, Users2, Inbox, Activity, CheckCircle2, XCircle,
  Clock, Sparkles, AlertTriangle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApplicantsBoard } from "@/components/employer/ApplicantsBoard";
import { ELIGIBLE_APPLICANT_FILTER } from "@/lib/talent-pool/eligibility";

export const dynamic = "force-dynamic";

/**
 * /employer/postings/[id]/applicants — the per-posting applicants
 * surface. Where a recruiter spends most of their day.
 *
 * Server responsibilities
 *   1. Gate on posting ownership (employer who created it) or admin.
 *   2. Compute the funnel-overview numbers (cheap groupBy + a few
 *      counts) and render them server-side so the page header reads
 *      instantly without waiting for the client board to hydrate.
 *   3. Detect stale applications (≥7 days in a non-terminal stage)
 *      so the header can nudge the recruiter to triage them.
 *   4. Hand the postingId + posting metadata to the client board,
 *      which does its own data fetch + handles all the interactivity.
 */
export default async function PostingApplicants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: { id: true, title: true, companyName: true, createdById: true, status: true, deadline: true },
  });
  if (!posting) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">Posting not found.</p>
      </div>
    );
  }

  const allowed = me.role === "admin" || me.role === "superadmin"
    || (me.role === "employer" && posting.createdById === me.id);
  if (!allowed) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">You don&apos;t have access to this posting.</p>
      </div>
    );
  }

  // ── Funnel overview ───────────────────────────────────────────
  // One groupBy + one stale-row count. Cheaper than re-pulling every
  // applicant row server-side just to render a header. The client
  // board will do its own fetch for the rich data.
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [byStage, stale, applied24h] = await Promise.all([
    // Eligibility gate applied to every count — the header numbers
    // must match the rows employers actually see.
    prisma.applicationStatus.groupBy({
      by: ["status"],
      where: { ...ELIGIBLE_APPLICANT_FILTER, postingId: id },
      _count: { status: true },
    }),
    prisma.applicationStatus.count({
      where: {
        ...ELIGIBLE_APPLICANT_FILTER,
        postingId: id,
        status: { in: ["new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer"] },
        stageEnteredAt: { lt: since7d },
      },
    }),
    prisma.applicationStatus.count({
      where: { ...ELIGIBLE_APPLICANT_FILTER, postingId: id, stageEnteredAt: { gt: since24h } },
    }),
  ]);
  const countByStatus: Record<string, number> = {};
  for (const g of byStage) countByStatus[g.status] = g._count.status;
  const total = byStage.reduce((sum, g) => sum + g._count.status, 0);
  const newCount = countByStatus.new ?? 0;
  const inProgress = (countByStatus.reviewing ?? 0)
    + (countByStatus.shortlisted ?? 0)
    + (countByStatus.phone_screen ?? 0)
    + (countByStatus.onsite ?? 0)
    + (countByStatus.offer ?? 0);
  const hired   = countByStatus.hired ?? 0;
  const closed  = (countByStatus.rejected ?? 0) + (countByStatus.closed ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={me.role === "employer" ? `/employer/postings/${id}` : "/admin"}
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Back to posting
        </Link>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2 tracking-tight">
          <Users2 size={20} className="text-brand-600" />
          Applicants — {posting.title}
        </h1>
        <p className="text-sm text-muted mt-1">
          {posting.companyName}
          {posting.deadline && (
            <> · deadline {new Date(posting.deadline).toLocaleDateString()}</>
          )}
        </p>
      </header>

      {/* ── Funnel overview ──────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-line bg-card"
        style={{
          boxShadow:
            "0 30px 60px -22px rgba(15, 23, 42, 0.22), 0 14px 28px -10px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 70% at 15% 20%, rgba(94, 143, 247, 0.16), transparent 60%)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 92% 88%, rgba(16, 185, 129, 0.10), transparent 65%)" }}
          aria-hidden
        />

        <div className="relative px-6 py-5 md:px-8 md:py-6">
          <div className="flex items-start gap-5 md:gap-8 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-2 rounded-3xl bg-brand-500/30 blur-2xl opacity-70" aria-hidden />
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-2xl ring-1 ring-white/40">
                  <Users2 size={26} strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700">
                  Total
                </p>
                <p className="text-4xl md:text-5xl font-black tabular-nums leading-none text-fg mt-0.5">
                  {total}
                </p>
                {applied24h > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-700 mt-1 inline-flex items-center gap-1">
                    <Sparkles size={10} /> +{applied24h} in the last 24h
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-[280px]">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
                Funnel
              </p>
              <FunnelBar
                segments={[
                  { label: "New",         count: newCount,    tone: "amber" },
                  { label: "In progress", count: inProgress,  tone: "brand" },
                  { label: "Hired",       count: hired,       tone: "emerald" },
                  { label: "Closed",      count: closed,      tone: "muted" },
                ]}
                total={total}
              />
              <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                <FunnelStat icon={Inbox} label="New" count={newCount} tone="amber" />
                <FunnelStat icon={Activity} label="In progress" count={inProgress} tone="brand" />
                <FunnelStat icon={CheckCircle2} label="Hired" count={hired} tone="emerald" />
                <FunnelStat icon={XCircle} label="Closed" count={closed} tone="muted" />
              </div>
            </div>
          </div>

          {/* Stale-application nudge — only when there's something to flag. */}
          {stale > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-xs">
              <AlertTriangle size={13} className="text-rose-700" />
              <span className="text-rose-900 font-semibold">
                {stale} application{stale === 1 ? " has" : "s have"} been stuck in the same stage for over 7 days.
              </span>
              <span className="text-rose-700/80">Use the &quot;Stale only&quot; filter to triage.</span>
            </div>
          )}
          {total > 0 && stale === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 text-xs">
              <Clock size={12} className="text-emerald-700" />
              <span className="text-emerald-900 font-semibold">
                Every application has moved within the last 7 days.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Board ─────────────────────────────────────────────────── */}
      <ApplicantsBoard postingId={posting.id} />
    </div>
  );
}

// ─── Server-rendered funnel helpers ─────────────────────────────

function FunnelBar({
  segments, total,
}: {
  segments: Array<{ label: string; count: number; tone: "amber" | "brand" | "emerald" | "muted" }>;
  total: number;
}) {
  const toneCls: Record<string, string> = {
    amber:   "bg-amber-500",
    brand:   "bg-brand-500",
    emerald: "bg-emerald-500",
    muted:   "bg-slate-400",
  };
  return (
    <div className="flex h-4 rounded-full overflow-hidden bg-elevated">
      {segments.map((s, idx) => {
        if (total === 0) return null;
        const pct = (s.count / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={idx}
            className={`${toneCls[s.tone]} transition-all`}
            style={{ width: `${pct}%` }}
            title={`${s.label}: ${s.count}`}
            aria-label={`${s.label}: ${s.count}`}
          />
        );
      })}
      {total === 0 && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-subtle">
          no applicants yet
        </div>
      )}
    </div>
  );
}

function FunnelStat({
  icon: Icon, label, count, tone,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  tone: "amber" | "brand" | "emerald" | "muted";
}) {
  const toneCls: Record<string, { icon: string; num: string }> = {
    amber:   { icon: "text-amber-700",   num: "text-fg" },
    brand:   { icon: "text-brand-700",   num: "text-fg" },
    emerald: { icon: "text-emerald-700", num: "text-fg" },
    muted:   { icon: "text-subtle",     num: "text-fg" },
  };
  return (
    <div className="inline-flex items-center gap-1 text-muted uppercase tracking-wider font-bold">
      <Icon size={10} className={toneCls[tone].icon} />
      <span>{label}</span>
      <span className={`tabular-nums font-bold ${toneCls[tone].num}`}>{count}</span>
    </div>
  );
}
