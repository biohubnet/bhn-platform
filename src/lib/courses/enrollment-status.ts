/**
 * Enrollment status → display bucket.
 *
 * `Enrollment.status` is a free-text String in the schema (the platform
 * uses no Prisma enums), so the set of live values is defined by whatever
 * writes it. Every writer, verified:
 *
 *   "active"     schema default, and api/courses/[id]/enroll when the
 *                course needs no approval
 *   "pending"    api/courses/[id]/enroll when the course is gated —
 *                enrolled, but waiting on an admin
 *   "completed"  api/scorm/session when the SCORM run reports
 *                passed/completed
 *   "failed"     api/scorm/session when it reports failed
 *   "withdrawn"  api/courses/[id]/enroll DELETE, api/admin/enrollments,
 *                and the admin review route
 *
 * The Progress Tracker used to query only "completed" and "active",
 * which meant a trainee who failed a SCORM assessment watched the course
 * disappear from their tracker entirely, and a gated enrolment awaiting
 * approval never appeared at all. Bucketing every status is what makes
 * the tracker a complete record rather than a partial one.
 *
 * `passed` / `complete` / `fail` are accepted as synonyms because the
 * page this logic came from accepted them. Nothing in the repo writes
 * them today, but a SCORM package or an import could, and treating an
 * unrecognised completion as "not started" would be the worse failure.
 */
export type EnrollmentBucket =
  | "in_progress"
  | "not_started"
  | "pending"
  | "completed"
  | "failed"
  | "withdrawn";

const COMPLETED_STATES = new Set(["completed", "passed", "complete"]);
const FAILED_STATES = new Set(["failed", "fail"]);

export function classifyEnrollment(status: string, progress: number): EnrollmentBucket {
  if (COMPLETED_STATES.has(status)) return "completed";
  if (FAILED_STATES.has(status)) return "failed";
  if (status === "withdrawn") return "withdrawn";
  if (status === "pending") return "pending";
  return progress > 0 ? "in_progress" : "not_started";
}

/**
 * Statuses that entitle a learner to open course content, record
 * progress, or record a completion.
 *
 * This is an ALLOW-LIST, and that is the point. `Enrollment.status` is
 * free text, so a value nobody anticipated — an import artifact, a
 * status added later, a typo — must be DENIED rather than admitted.
 * Deriving access from the display bucket instead would fail open:
 * `classifyEnrollment` ends `return progress > 0 ? ... : "not_started"`,
 * so an unrecognised status lands in a bucket that looks launchable.
 *
 * Mirrors how the pathway side has always done it — see
 * `lib/pathway-enrollment.ts`, which counts `status: { in: ["approved",
 * "completed"] }` rather than asking whether a row exists.
 *
 * Denied:
 *   pending    — the credit debit for an approval-gated course is
 *                deliberately deferred until an admin approves
 *                (api/courses/[id]/enroll skips the deduction and
 *                api/admin/enrollments/[id]/review performs it). That
 *                design only holds if an unapproved request also
 *                delivers nothing.
 *   withdrawn  — written both when a trainee leaves AND when an admin
 *                DECLINES a gated request (the review route's "reject"
 *                action). Admitting it makes a decline unenforceable.
 *
 * Allowed:
 *   active     — approved and paid for.
 *   completed  — re-entry is the product's intent; the tracker labels
 *                the control "Review", and a learner should be able to
 *                re-read a course they hold a certificate for.
 *   failed     — likewise "Retry". The Progress Tracker says so in
 *                copy: "your best attempt is the one that counts".
 *
 * ONE predicate, used by both the UI and the server-side gates, so the
 * button a learner sees and the door the server opens cannot drift
 * apart. Do not add a second, laxer copy for presentation.
 */
const CONTENT_ACCESS_STATES = new Set([
  "active",
  "completed", "passed", "complete",
  "failed", "fail",
]);

export function canAccessCourseContent(status: string | null | undefined): boolean {
  return typeof status === "string" && CONTENT_ACCESS_STATES.has(status);
}
