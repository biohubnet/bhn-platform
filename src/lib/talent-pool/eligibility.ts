/**
 * Eligibility gate — shared helpers.
 *
 * The talent-pool eligibility check is a two-step admit:
 *   1. EventFormSubmission.reviewStatus = "approved"
 *   2. EventFormSubmission.eligibilityApprovedAt IS NOT NULL
 *
 * Step 2 is the human-confirmation gate that determines whether the
 * member is visible to employers. The exports in this module make
 * sure every employer-facing surface enforces the gate consistently
 * — one source of truth for the WHERE fragment + a single per-user
 * eligibility check for surfaces that don't run a list query.
 */
import { prisma } from "@/lib/prisma";

/**
 * Prisma WHERE-fragment that, when nested into an ApplicationStatus
 * (or any model with an `applicant: User` relation), restricts to
 * applicants whose talent-application submission has been
 * eligibility-approved AND who haven't left the pool.
 *
 *   prisma.applicationStatus.findMany({
 *     where: { ...ELIGIBLE_APPLICANT_FILTER, postingId: id },
 *     ...
 *   })
 */
export const ELIGIBLE_APPLICANT_FILTER = {
  applicant: {
    formSubmissions: {
      some: {
        form: { slug: "talent-application" },
        reviewStatus: { in: ["approved", "approved_skip_review"] },
        eligibilityApprovedAt: { not: null },
        leftPoolAt: null,
      },
    },
  },
} as const;

/**
 * Per-user eligibility check. Returns true when the user has at
 * least one talent-application submission that is admin-approved,
 * eligibility-approved, and still in the pool. Used by single-
 * applicant detail pages that can't easily filter at query time
 * (e.g. /employer/postings/[id]/applicants/[appId]).
 */
export async function isUserEligibleForEmployers(userId: string): Promise<boolean> {
  const count = await prisma.eventFormSubmission.count({
    where: {
      userId,
      form: { slug: "talent-application" },
      reviewStatus: { in: ["approved", "approved_skip_review"] },
      eligibilityApprovedAt: { not: null },
      leftPoolAt: null,
    },
  });
  return count > 0;
}
