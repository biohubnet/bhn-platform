/**
 * Resume access + comment permissions.
 *
 * Visibility (read the structured resume + its comments):
 *   • Self (the resume's owner)            — always
 *   • Admin / superadmin                   — always
 *   • Instructor                           — always (mentorship + course-cohort use case)
 *   • Industrial mentor                    — always (the role exists explicitly for this)
 *   • Employer                             — only when the resume's owner is in the
 *                                            employer's posting pipeline AND
 *                                            eligibility-approved on the talent pool
 *
 * Commenting (post + resolve):
 *   • Self                                 — yes (notes-to-self)
 *   • Admin / instructor / mentor          — yes
 *   • Employer                             — yes when visibility allows
 *
 * Editing the resume tree:
 *   • Self only. Mentors / admins suggest via comments; the trainee
 *     accepts or rejects each one. This is non-negotiable per the
 *     product brief: "allow user to change anything."
 */
import { prisma } from "@/lib/prisma";

export const RESUME_COMMENTER_ROLES = [
  "admin", "superadmin", "instructor", "industrial_mentor", "employer",
] as const;

/** Owner of the resume can always read + edit. */
export function isResumeOwner(viewerId: string, resumeOwnerId: string): boolean {
  return viewerId === resumeOwnerId;
}

/** Only the owner can edit. */
export function canEditResume(viewerId: string, resumeOwnerId: string): boolean {
  return isResumeOwner(viewerId, resumeOwnerId);
}

/** Staff-tier reviewers (admin / superadmin / instructor / industrial
 *  mentor) — always have read + comment access. Employer access goes
 *  through the eligibility / pipeline check in canViewResume(). */
export function isStaffReviewer(role: string): boolean {
  return ["admin", "superadmin", "instructor", "industrial_mentor"].includes(role);
}

/** Can the caller see this resume (and its comment thread)? */
export async function canViewResume(args: {
  viewerId: string;
  viewerRole: string;
  resumeOwnerId: string;
}): Promise<boolean> {
  if (isResumeOwner(args.viewerId, args.resumeOwnerId)) return true;
  if (isStaffReviewer(args.viewerRole)) return true;

  if (args.viewerRole === "employer") {
    // Employer can see if the owner is eligibility-approved (so the
    // existing talent-pool gate isn't bypassed via the resume URL)
    // AND has an active application on a posting the employer owns.
    const eligible = await prisma.eventFormSubmission.findFirst({
      where: {
        userId: args.resumeOwnerId,
        form: { slug: "talent-application" },
        reviewStatus: { in: ["approved", "approved_skip_review"] },
        eligibilityApprovedAt: { not: null },
        leftPoolAt: null,
      },
      select: { id: true },
    });
    if (!eligible) return false;
    const status = await prisma.applicationStatus.findFirst({
      where: { applicantId: args.resumeOwnerId, posting: { createdById: args.viewerId } },
      select: { id: true },
    });
    return !!status;
  }
  return false;
}

/** Can the caller post a comment on this resume? */
export async function canCommentOnResume(args: {
  viewerId: string;
  viewerRole: string;
  resumeOwnerId: string;
}): Promise<boolean> {
  // Owner can leave notes-to-self.
  if (isResumeOwner(args.viewerId, args.resumeOwnerId)) return true;
  // Otherwise role must be in the commenter set AND the viewer must
  // have read access (which is the stricter gate for employers).
  if (!(RESUME_COMMENTER_ROLES as readonly string[]).includes(args.viewerRole)) return false;
  return canViewResume(args);
}
