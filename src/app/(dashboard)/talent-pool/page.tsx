import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Search, ArrowRight, MessageCircle, Lock, CheckCircle2, Hourglass } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, isCommentable } from "@/lib/talent-pool/comments";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { EligibilityBatchToolbar, RowCheckbox } from "@/components/talent-pool/EligibilityBatchToolbar";

/**
 * /talent-pool — admin + employer + instructor view of approved
 * talent-application submissions. Two-step gate:
 *
 *   1. reviewStatus = "approved"  — admin admits the submission to
 *      the internal talent pool. Visible to admins/instructors but
 *      NOT yet to employers.
 *   2. eligibilityApprovedAt != null — a human has verified the
 *      submitter is eligible to be shown to employers. Only then
 *      do they appear in the employer-facing view of this page.
 *
 * Per-row link goes to /talent-pool/[sid] for the full submission
 * + comment thread. Admins/instructors get a batch toolbar at the
 * top of the list for approving/revoking eligibility in bulk.
 */
export default async function TalentPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/talent-pool");
  const role = (session.user as { role?: string }).role ?? "";
  if (!canComment(role)) redirect("/dashboard");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-muted">Talent application form not configured yet.</p>
      </div>
    );
  }

  const isAdmin = role === "admin" || role === "superadmin";
  const isInstructor = role === "instructor";
  const isEmployer = role === "employer";
  // Staff can approve eligibility (admin/instructor); employers cannot.
  const canApproveEligibility = isAdmin || isInstructor;

  const submissions = await prisma.eventFormSubmission.findMany({
    where: {
      formId: form.id,
      reviewStatus: { in: ["approved", "approved_skip_review"] },
      leftPoolAt: null,
      // Employer-facing gate: only show eligibility-approved rows.
      // Admin/instructor: include un-checked ones so they can approve.
      ...(isEmployer ? { eligibilityApprovedAt: { not: null } } : {}),
      ...(q && {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } },
      _count: { select: { comments: true } },
    },
  });

  // Resolve approver names in one round-trip — `eligibilityApprovedBy`
  // stores a userId, so we fetch only the unique ids touched here.
  const approverIds = Array.from(
    new Set(submissions.map((s) => s.eligibilityApprovedBy).filter((v): v is string => !!v))
  );
  const approverMap = approverIds.length > 0
    ? new Map(
        (await prisma.user.findMany({
          where: { id: { in: approverIds } },
          select: { id: true, name: true, email: true },
        })).map((u) => [u.id, u])
      )
    : new Map<string, { id: string; name: string | null; email: string | null }>();

  // Pool-wide eligibility split — helps admins see what's left to triage.
  const eligibleCount = submissions.filter((s) => s.eligibilityApprovedAt).length;
  const pendingCount = submissions.length - eligibleCount;

  return (
    <div className="space-y-6">
      <DSPageHeader
        eyebrow={`${isEmployer ? "Employer" : "Admin"} · Experience`}
        title={`Talent pool (${submissions.length})`}
        description={
          isEmployer
            ? "Eligibility-checked talent-application submissions. These members have been verified for employer review. Click any entry to view the full application."
            : "Approved talent-application submissions. Tick the eligibility box to release each member to employers. Click any entry to view the full application and leave private comments (visible to admins + employers only — never to the applicant)."
        }
      />

      {isAdmin && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <DemoSeedAndClearTray
            entity="form_submission"
            scope={{ formSlug: "talent-application" }}
            noun="demo applicants"
            clearHelp="Delete every talent-application submission from demo accounts. The submitters themselves stay (reusable for other tests). Real applicants are not touched."
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

      <form action="/talent-pool" method="get" className="flex items-center gap-2">
        <label className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="w-full bg-card border border-line rounded-xl pl-8 pr-3 py-2 text-sm"
          />
        </label>
        {q && (
          <Link href="/talent-pool" className="text-xs text-muted hover:text-fg">
            Clear
          </Link>
        )}
        {/* Pool-wide eligibility split — gives admins/instructors a
            sense of "how much triage is left" before they scroll. */}
        {canApproveEligibility && submissions.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {eligibleCount} eligible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pendingCount} pending
            </span>
          </span>
        )}
      </form>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <Users size={24} className="mx-auto text-muted mb-2" />
          <p className="text-sm font-medium text-muted">
            {isEmployer
              ? "No eligibility-checked members yet."
              : "No matching members in the pool."}
          </p>
        </div>
      ) : canApproveEligibility ? (
        // Admin / instructor — wrap the list in the batch toolbar.
        <EligibilityBatchToolbar allIds={submissions.map((s) => s.id)}>
          <SubmissionList
            submissions={submissions}
            approverMap={approverMap}
            showCheckbox
          />
        </EligibilityBatchToolbar>
      ) : (
        // Employer — flat list, no batch UI.
        <SubmissionList submissions={submissions} approverMap={approverMap} />
      )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

interface SubmissionRow {
  id: string;
  reviewStatus: string;
  createdAt: Date;
  eligibilityApprovedAt: Date | null;
  eligibilityApprovedBy: string | null;
  eligibilityNote: string | null;
  email: string | null;
  user: {
    id: string; name: string | null; email: string | null;
    organization: string | null; jobTitle: string | null;
  } | null;
  _count: { comments: number };
}

function SubmissionList({
  submissions, approverMap, showCheckbox,
}: {
  submissions: SubmissionRow[];
  approverMap: Map<string, { id: string; name: string | null; email: string | null }>;
  showCheckbox?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {submissions.map((s) => {
        const isEligible = !!s.eligibilityApprovedAt;
        const approver = s.eligibilityApprovedBy ? approverMap.get(s.eligibilityApprovedBy) : null;
        const approverName = approver?.name ?? approver?.email?.split("@")[0] ?? null;
        return (
          <li key={s.id} className="flex items-stretch gap-2">
            {showCheckbox && (
              <div className="self-stretch flex items-center px-1.5">
                <RowCheckbox id={s.id} label={`Select ${s.user?.name ?? s.user?.email ?? s.id}`} />
              </div>
            )}
            <Link
              href={`/talent-pool/${s.id}`}
              className="flex-1 block rounded-2xl border border-line bg-card hover:border-brand-300 transition-colors p-4 surface-shadow"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-fg">
                      {s.user?.name ?? <span className="italic text-muted">No name</span>}
                    </p>
                    {/* Eligibility badge — emerald when eligible (employer-visible),
                        amber otherwise (admin-only). */}
                    {isEligible ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200">
                        <CheckCircle2 size={9} /> Eligible
                        {approverName && <span className="opacity-75 normal-case tracking-normal font-normal ml-0.5">· {approverName}</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200">
                        <Hourglass size={9} /> Eligibility pending
                      </span>
                    )}
                    {!isCommentable(s.reviewStatus) && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200">
                        <Lock size={9} /> Comments locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {s.user?.email ?? s.email ?? "—"}
                  </p>
                  {(s.user?.jobTitle || s.user?.organization) && (
                    <p className="text-[11px] text-subtle mt-0.5">
                      {s.user?.jobTitle}{s.user?.jobTitle && s.user?.organization && " · "}{s.user?.organization}
                    </p>
                  )}
                  {isEligible && s.eligibilityApprovedAt && (
                    <p className="text-[10.5px] text-subtle font-mono mt-1 uppercase tracking-[0.14em]">
                      Approved {new Date(s.eligibilityApprovedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      {s.eligibilityNote && <span className="normal-case tracking-normal italic"> · &ldquo;{s.eligibilityNote}&rdquo;</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted shrink-0">
                  {s._count.comments > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle size={11} />
                      {s._count.comments}
                    </span>
                  )}
                  <span className="text-[11px] text-subtle">
                    {new Date(s.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <ArrowRight size={12} className="text-subtle" />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
