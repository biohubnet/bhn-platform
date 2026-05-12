/**
 * Helpers + constants for the talent-pool comment + feedback
 * surfaces. Kept in one module so the eligibility-gate logic +
 * the role-check are referenced consistently across API routes
 * and UI feature-flag conditions.
 */

/**
 * Submissions reach commentability when an admin has approved
 * them — either through standard review or the audit-logged
 * "skip approval" admin fast-path. Pending / rejected submissions
 * are NOT commentable; the whole point of the gate is to prevent
 * employers from advancing a candidate past the eligibility check.
 */
export const COMMENTABLE_REVIEW_STATUSES = ["approved", "approved_skip_review"] as const;

export function isCommentable(reviewStatus: string): boolean {
  return (COMMENTABLE_REVIEW_STATUSES as readonly string[]).includes(reviewStatus);
}

/** Roles permitted to post comments on talent applications. */
export const COMMENTER_ROLES = ["admin", "superadmin", "employer", "instructor"] as const;
export function canComment(role: string): boolean {
  return (COMMENTER_ROLES as readonly string[]).includes(role);
}

/** Per-comment body size cap — matches reviewer notes. */
export const COMMENT_MAX_LENGTH = 4000;

/** Exit-survey reason vocabulary. UI shows pretty labels; the wire
 *  value is short + machine-friendly so aggregations are stable. */
export const EXIT_REASONS = [
  "found_job",
  "career_change",
  "not_relevant",
  "platform_quality",
  "found_elsewhere",
  "other",
] as const;
export type ExitReason = (typeof EXIT_REASONS)[number];
export function isExitReason(s: unknown): s is ExitReason {
  return typeof s === "string" && (EXIT_REASONS as readonly string[]).includes(s);
}

export const EXIT_REASON_LABEL: Record<ExitReason, string> = {
  found_job: "I found a job",
  career_change: "Career direction changed",
  not_relevant: "Opportunities weren't a fit",
  platform_quality: "Platform / experience issue",
  found_elsewhere: "Found opportunities elsewhere",
  other: "Other reason",
};

/** Default TTL for admin-issued feedback invitations. */
export const FEEDBACK_INVITE_TTL_DAYS = 30;
