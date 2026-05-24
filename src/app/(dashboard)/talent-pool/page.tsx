import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ArrowRight, MessageCircle, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, isCommentable } from "@/lib/talent-pool/comments";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { EligibilityBatchToolbar, RowCheckbox } from "@/components/talent-pool/EligibilityBatchToolbar";
import { TalentPoolFilterBar } from "@/components/talent-pool/TalentPoolFilterBar";

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
  searchParams: Promise<{ q?: string; skills?: string; stage?: string; available?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/talent-pool");
  const role = (session.user as { role?: string }).role ?? "";
  if (!canComment(role)) redirect("/dashboard");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const skillsParam = sp.skills?.trim() ?? "";
  const stage = sp.stage?.trim() ?? "";
  const available = sp.available === "true";

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

  // Skills filter: resolve skill names → userIds with matching UserSkill rows.
  // We do a case-insensitive partial match on skill name so "PCR" matches "PCR
  // amplification" etc. When no skills param is given this step is skipped.
  const skillTokens = skillsParam
    ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let skillFilterUserIds: string[] | null = null;
  if (skillTokens.length > 0) {
    // Find all Skill ids whose name matches any token (case-insensitive).
    const matchingSkills = await prisma.skill.findMany({
      where: {
        OR: skillTokens.map((token) => ({
          name: { contains: token, mode: "insensitive" as const },
        })),
        status: { not: "deprecated" },
      },
      select: { id: true },
    });
    const skillIds = matchingSkills.map((s) => s.id);
    if (skillIds.length === 0) {
      // No skills matched — no results.
      skillFilterUserIds = [];
    } else {
      const userSkills = await prisma.userSkill.findMany({
        where: { skillId: { in: skillIds } },
        select: { userId: true },
        distinct: ["userId"],
      });
      skillFilterUserIds = userSkills.map((us) => us.userId);
    }
  }

  // Stage filter: find applicantIds that have an ApplicationStatus with the
  // requested status value.
  let stageFilterUserIds: string[] | null = null;
  if (stage) {
    const statuses = await prisma.applicationStatus.findMany({
      where: { status: stage },
      select: { applicantId: true },
      distinct: ["applicantId"],
    });
    stageFilterUserIds = statuses.map((s) => s.applicantId);
  }

  // Available filter: exclude candidates who already have offer/hired status.
  let unavailableUserIds: string[] | null = null;
  if (available) {
    const placed = await prisma.applicationStatus.findMany({
      where: { status: { in: ["offer", "hired"] } },
      select: { applicantId: true },
      distinct: ["applicantId"],
    });
    unavailableUserIds = placed.map((s) => s.applicantId);
  }

  // Build the user-id filter combining skills + stage + available constraints.
  // All active constraints must be satisfied (intersection).
  let userIdFilter: { in: string[] } | { notIn: string[] } | undefined = undefined;
  {
    const includeSets: string[][] = [];
    if (skillFilterUserIds !== null) includeSets.push(skillFilterUserIds);
    if (stageFilterUserIds !== null) includeSets.push(stageFilterUserIds);

    if (includeSets.length > 0) {
      // Intersect all include sets.
      const intersected = includeSets.reduce((acc, cur) => {
        const s = new Set(cur);
        return acc.filter((id) => s.has(id));
      });
      userIdFilter = { in: intersected };
    }

    if (unavailableUserIds !== null && unavailableUserIds.length > 0) {
      // If we already have an include set, subtract unavailable from it.
      if (userIdFilter && "in" in userIdFilter) {
        const excludeSet = new Set(unavailableUserIds);
        userIdFilter = { in: userIdFilter.in.filter((id) => !excludeSet.has(id)) };
      } else {
        // No include constraint yet — just exclude.
        userIdFilter = { notIn: unavailableUserIds };
      }
    }
  }

  const submissions = await prisma.eventFormSubmission.findMany({
    where: {
      formId: form.id,
      reviewStatus: { in: ["approved", "approved_skip_review"] },
      leftPoolAt: null,
      // Employer-facing gate: only show eligibility-approved rows.
      // Admin/instructor: include un-checked ones so they can approve.
      ...(isEmployer ? { eligibilityApprovedAt: { not: null } } : {}),
      // User-id filter from skills/stage/available constraints.
      ...(userIdFilter !== undefined
        ? { user: { id: userIdFilter } }
        : {}),
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
            : "Approved talent-application submissions. Every new row lands as 'Awaiting admin approval' and is hidden from employers until you tick the box and click 'Approve eligibility' — that's the second gate. Click any entry to view the full application and leave private comments."
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

      <TalentPoolFilterBar q={q} skills={skillsParam} stage={stage} available={available} />

      {/* Pool-wide eligibility split — gives admins/instructors a
          sense of "how much triage is left" before they scroll. */}
      {canApproveEligibility && submissions.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-[0.18em] text-fg-muted">
          {(q || skillsParam || stage || available) && (
            <Link href="/talent-pool" className="text-xs text-muted hover:text-fg font-sans normal-case tracking-normal mr-auto">
              ← Clear filters
            </Link>
          )}
          <span className="ml-auto inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {eligibleCount} eligible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pendingCount} pending
            </span>
          </span>
        </div>
      )}
      {!canApproveEligibility && (q || skillsParam || stage || available) && (
        <div>
          <Link href="/talent-pool" className="text-xs text-muted hover:text-fg">
            ← Clear filters
          </Link>
        </div>
      )}

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

/**
 * Table-style submission list — one continuous rounded-2xl panel on
 * a soft brand wash, hairline `border-t border-line` rules between
 * rows (no per-row card chrome). A small column header on top labels
 * the grid so the layout reads as a table rather than a list.
 *
 * Each row is a clickable Link styled as a grid:
 *
 *   [✓] · Member (name + email + org)  · Eligibility · Comments · Submitted · ↗
 *
 * Hover gives a faint elevated wash and slides the trailing arrow
 * one pixel — same affordance the courses + internships pages use.
 */
function SubmissionList({
  submissions, approverMap, showCheckbox,
}: {
  submissions: SubmissionRow[];
  approverMap: Map<string, { id: string; name: string | null; email: string | null }>;
  showCheckbox?: boolean;
}) {
  // Grid template: optional checkbox · member · eligibility ·
  // comments · date · arrow. Symmetrical across header and rows.
  const gridCols = showCheckbox
    ? "grid-cols-[28px_minmax(0,2.2fr)_minmax(0,1.4fr)_60px_110px_18px]"
    : "grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_60px_110px_18px]";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-line"
      style={{
        backgroundImage:
          "linear-gradient(180deg, var(--brand-50) 0%, var(--card-solid) 35%, var(--card-solid) 70%, var(--brand-50) 100%)",
      }}
    >
      {/* Column header — small mono-eyebrow labels above the rule. */}
      <div
        className={`hidden sm:grid ${gridCols} gap-4 px-4 py-2.5 border-b border-line bg-elevated/30 text-[10px] font-mono uppercase tracking-[0.22em] text-fg-subtle font-bold`}
      >
        {showCheckbox && <span />}
        <span>Member</span>
        <span>Eligibility</span>
        <span className="text-right pr-1">Activity</span>
        <span>Submitted</span>
        <span />
      </div>

      {submissions.map((s, i) => {
        const isEligible = !!s.eligibilityApprovedAt;
        const approver = s.eligibilityApprovedBy ? approverMap.get(s.eligibilityApprovedBy) : null;
        const approverName = approver?.name ?? approver?.email?.split("@")[0] ?? null;
        const commentsLocked = !isCommentable(s.reviewStatus);
        const displayName = s.user?.name ?? null;

        return (
          <div
            key={s.id}
            className={
              "group grid items-center transition-colors hover:bg-elevated/40 " +
              gridCols +
              " gap-3 sm:gap-4 px-3 sm:px-4 py-3 " +
              (i > 0 ? "border-t border-line " : "")
            }
          >
            {showCheckbox && (
              <div className="flex items-center justify-center">
                <RowCheckbox id={s.id} label={`Select ${displayName ?? s.user?.email ?? s.id}`} />
              </div>
            )}

            {/* Member — name + email + role/org stacked. The whole
                cell is a Link so the entire row is clickable; the
                trailing arrow on the right is part of the same
                grid so the click target stays huge. */}
            <Link href={`/talent-pool/${s.id}`} className="contents">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-fg truncate group-hover:text-brand-700 transition-colors">
                  {displayName ?? <span className="italic text-muted">No name</span>}
                </p>
                <p className="text-[12px] text-fg-muted truncate">
                  {s.user?.email ?? s.email ?? "—"}
                </p>
                {(s.user?.jobTitle || s.user?.organization) && (
                  <p className="text-[11px] text-subtle truncate mt-0.5">
                    {s.user?.jobTitle}{s.user?.jobTitle && s.user?.organization && " · "}{s.user?.organization}
                  </p>
                )}
              </div>

              {/* Eligibility — badge + (when set) approver line + date. */}
              <div className="min-w-0 flex flex-col gap-1">
                {/* Eligibility chip — two unambiguous states, with a
                    deliberately strong colour gap so admins can never
                    misread an un-approved row as approved:
                      • Eligible (admin-approved) → emerald + Check
                      • Awaiting approval         → rose + AlertTriangle
                    The rose tone reads as "this row needs you" rather
                    than "everything's fine"; the icon + verb-y label
                    ("Awaiting") confirms it's a TO-DO state. */}
                {isEligible ? (
                  <>
                    <span className="inline-flex items-center gap-1 self-start text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200">
                      <CheckCircle2 size={9} /> Eligible
                    </span>
                    {approverName && (
                      <p className="text-[11px] text-fg-muted truncate">
                        by <span className="text-fg">{approverName}</span>
                        {s.eligibilityApprovedAt && (
                          <span className="text-subtle"> · {new Date(s.eligibilityApprovedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                        )}
                      </p>
                    )}
                    {s.eligibilityNote && (
                      <p className="text-[10.5px] text-subtle italic truncate" title={s.eligibilityNote}>
                        &ldquo;{s.eligibilityNote}&rdquo;
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 self-start text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-rose-50 text-rose-800 ring-rose-200">
                      <AlertTriangle size={9} /> Awaiting admin approval
                    </span>
                    <p className="text-[10.5px] text-fg-subtle italic">
                      Hidden from employers until approved
                    </p>
                  </>
                )}
                {commentsLocked && (
                  <span className="inline-flex items-center gap-1 self-start text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200">
                    <Lock size={9} /> Comments locked
                  </span>
                )}
              </div>

              {/* Activity — comments count (just a dash when none). */}
              <div className="text-right pr-1 text-fg-muted">
                {s._count.comments > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <MessageCircle size={11} />
                    <span className="font-mono tabular-nums">{s._count.comments}</span>
                  </span>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </div>

              {/* Submitted date — mono, two-line allowed. */}
              <div className="text-[11.5px] font-mono text-fg-subtle tabular-nums">
                {new Date(s.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </div>

              <ArrowRight
                size={14}
                className="text-subtle group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all justify-self-end"
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
