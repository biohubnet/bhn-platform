/**
 * /progress — ENGAGE Progress Tracker.
 *
 * The single trainee-facing record of where they stand: credit
 * utilisation against the award, and every course they are enrolled in.
 *
 * This page absorbed /my-courses (Sep 2026). Before that the two split
 * the same job badly — the tracker held the credits and a read-only list
 * of course titles, while /my-courses held the list you could actually
 * act on. A trainee wanting to resume a course had to know which of the
 * two tabs carried the button. Folding them together also fixed two
 * gaps that were invisible while the pages were separate:
 *
 *   • The tracker queried only status "completed" and "active", so a
 *     course a trainee FAILED vanished from their tracker entirely, and
 *     a gated enrolment awaiting approval never appeared. Every status
 *     is now bucketed — see lib/courses/enrollment-status.ts.
 *   • /my-courses filed `pending` and `withdrawn` rows under its normal
 *     buckets and offered them a working Launch button. Those two states
 *     now get their own sections and no launch control.
 *
 * The utilisation maths lives in lib/credits/utilization.ts. The one
 * deliberate difference from the current platform: it states the
 * 6-month early-expiry rule as POLICY rather than as a countdown,
 * because nothing in this build enforces it yet (the sweeper applies a
 * per-grant 365-day TTL and has no utilisation checkpoint). Saying
 * "credits expire on this date" when no job acts on that date would be
 * a lie the UI tells confidently — see EARLY_EXPIRY_ENFORCED.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Clock, Coins, GraduationCap, Hourglass, LogOut, XCircle, PlayCircle } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { DSSection } from "@/components/design-system/DSSection";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";
import {
  creditUtilization,
  CREDIT_AWARD_TOTAL,
  CREDIT_HALFWAY_MILESTONE,
  EARLY_EXPIRY_ENFORCED,
} from "@/lib/credits/utilization";
import { CompletedCoursesExport } from "@/components/engage/CompletedCoursesExport";
import { CreditStatement } from "@/components/engage/CreditStatement";
import { EnrollmentRow, type EnrollmentRowData } from "@/components/lms/EnrollmentRow";
import { classifyEnrollment, type EnrollmentBucket } from "@/lib/courses/enrollment-status";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  return d
    ? d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
    : "—";
}

export default async function ProgressTrackerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "user";
  const displayName = session.user?.name ?? session.user?.email ?? "Trainee";
  // Admin / superadmin get an inline "Leave" affordance on every row —
  // fast cleanup after testing player flows. Carried over from
  // /my-courses, which was this button's only home.
  const isStaff = checkIsStaff(role);

  const [util, enrollments] = await Promise.all([
    creditUtilization(userId),
    // ONE unfiltered read. The old page ran two status-filtered queries
    // and silently dropped everything they did not name; bucketing in
    // memory costs nothing at a trainee's enrolment count and cannot
    // lose a row to a status nobody thought of.
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            title: true,
            code: true,
            duration: true,
            scormPackage: { select: { id: true } },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  const buckets: Record<EnrollmentBucket, EnrollmentRowData[]> = {
    in_progress: [], not_started: [], pending: [], completed: [], failed: [], withdrawn: [],
  };
  for (const e of enrollments) {
    buckets[classifyEnrollment(e.status, e.progress)].push(e);
  }
  // Finished work reads best newest-first by when it finished, not by
  // when it was started.
  buckets.completed.sort(
    (a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
  );

  const live = enrollments.length - buckets.withdrawn.length;
  const description = enrollments.length === 0
    ? "Your training credits, and every course you enrol in. Nothing enrolled yet — the catalogue is the place to start."
    : `${live} ${live === 1 ? "course" : "courses"} · ${buckets.in_progress.length} in progress · ${buckets.completed.length} completed. Your training credits are below.`;

  const section = (
    key: EnrollmentBucket,
    title: string,
    icon: React.ReactNode,
    opts?: { always?: boolean; note?: string; children?: React.ReactNode },
  ) => {
    const rows = buckets[key];
    if (rows.length === 0 && !opts?.always) return null;
    return (
      <DSSection key={key} title={title} eyebrow={`${rows.length}`} icon={icon}>
        {opts?.note && <p className="text-sm text-muted mb-3">{opts.note}</p>}
        {opts?.children}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing here right now.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((e) => (
              <EnrollmentRow key={e.id} e={e} bucket={key} isStaff={isStaff} />
            ))}
          </div>
        )}
      </DSSection>
    );
  };

  return (
    <div>
      <PageHero
        eyebrow={<><GraduationCap size={12} /> ENGAGE</>}
        title="Progress Tracker"
        description={description}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* ── Training credits ─────────────────────────────────── */}
        <DSSection title="Training Credits" eyebrow="Utilisation" icon={<Coins size={15} />}>
          <CreditStatement
            used={util.used}
            total={CREDIT_AWARD_TOTAL}
            threshold={CREDIT_HALFWAY_MILESTONE}
            balance={util.balance}
            asOf={fmt(new Date())}
            thresholdMet={util.halfwayMet}
          />

          {/* Milestones */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-fg mb-2">Make sure to…</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <CircleCheck
                  size={15}
                  className={util.halfwayMet ? "text-emerald-600 mt-0.5 shrink-0" : "text-subtle mt-0.5 shrink-0"}
                />
                <span className={util.halfwayMet ? "text-muted line-through" : "text-fg"}>
                  Use {CREDIT_HALFWAY_MILESTONE.toLocaleString()} credits by{" "}
                  <strong>{fmt(util.checkpointAt)}</strong> to avoid early expiry
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck
                  size={15}
                  className={util.fullMet ? "text-emerald-600 mt-0.5 shrink-0" : "text-subtle mt-0.5 shrink-0"}
                />
                <span className={util.fullMet ? "text-muted line-through" : "text-fg"}>
                  Use {CREDIT_AWARD_TOTAL.toLocaleString()} credits by{" "}
                  <strong>{fmt(util.fullTermAt)}</strong>
                </span>
              </li>
            </ul>
            {util.issuedAt === null && (
              <p className="text-xs text-subtle mt-2">
                Dates appear once your first credits are granted.
              </p>
            )}
          </div>

          {/* Policy */}
          <div className="mt-5 rounded-xl border border-line bg-elevated p-4">
            <p className="text-sm font-semibold text-fg mb-2">Credit policy</p>
            <p className="text-sm text-muted">
              If credit utilisation at six months post-issuance is{" "}
              <strong className="text-rose-700">under {CREDIT_HALFWAY_MILESTONE.toLocaleString()}</strong>,
              remaining credits expire immediately. At{" "}
              <strong className="text-emerald-700">{CREDIT_HALFWAY_MILESTONE.toLocaleString()} or more</strong>,
              they stay valid until one year post-issuance.
            </p>
            {!EARLY_EXPIRY_ENFORCED && (
              <p className="text-xs text-subtle mt-2">
                Today this build only applies the {CREDIT_GRANT_TTL_DAYS}-day per-grant
                expiry; the six-month checkpoint is policy, not yet automated.
              </p>
            )}
          </div>
        </DSSection>

        {/* ── Courses ──────────────────────────────────────────── */}
        {enrollments.length === 0 ? (
          <DSSection title="Your courses" eyebrow="0" icon={<PlayCircle size={15} />}>
            <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-line space-y-3">
              <span className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
                <GraduationCap size={20} />
              </span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-fg">No courses yet</p>
                <p className="text-sm text-muted max-w-md mx-auto">
                  Pick something from the catalogue to start learning. Everything you enrol
                  in shows up here, along with what you have finished.
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-md hover:bg-brand-700 transition-colors"
              >
                Browse the catalogue
              </Link>
            </div>
          </DSSection>
        ) : (
          <>
            {section("in_progress", "In progress", <Clock size={15} />, { always: true })}
            {section("not_started", "Not yet started", <PlayCircle size={15} />)}
            {section("pending", "Awaiting approval", <Hourglass size={15} />, {
              note: "These need an admin to approve your place before you can start.",
            })}
            {section("completed", "Completed", <CircleCheck size={15} />, {
              always: true,
              children: buckets.completed.length > 0 ? (
                <div className="mb-3">
                  <CompletedCoursesExport
                    traineeName={displayName}
                    rows={buckets.completed.map((e) => ({
                      title: e.course.title,
                      code: e.course.code ?? null,
                      completedAt: e.completedAt ? e.completedAt.toISOString() : null,
                    }))}
                  />
                </div>
              ) : null,
            })}
            {section("failed", "Did not pass", <XCircle size={15} />, {
              note: "Retry when you are ready — your best attempt is the one that counts.",
            })}
            {section("withdrawn", "Withdrawn", <LogOut size={15} />, {
              note: "You left these. Re-enrol from the catalogue if you want to pick one back up.",
            })}
          </>
        )}
      </div>
    </div>
  );
}
