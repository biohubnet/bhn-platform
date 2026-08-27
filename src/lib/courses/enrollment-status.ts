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
 * Whether a row may offer a launch / resume control.
 *
 * `pending` has not been approved yet and `withdrawn` has been left, so
 * neither should be presented as resumable. This is a UI decision, not
 * an access control: `/player/[courseId]` gates on the *existence* of an
 * enrollment row (`if (!enrollment && !isStaff)`), not its status, so a
 * withdrawn or unapproved trainee who kept the URL can still open the
 * player. Tightening that gate is a separate change to the player route.
 */
export function isLaunchable(bucket: EnrollmentBucket): boolean {
  return bucket !== "pending" && bucket !== "withdrawn";
}
