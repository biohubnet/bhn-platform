/**
 * Trainee voluntarily leaves the talent pool.
 *
 *   POST /api/profile/talent-pool/leave
 *     body: {
 *       reason: ExitReason,
 *       feedback?: { … exit-survey fields … },
 *       skipFeedback?: boolean
 *     }
 *
 * The user owns this action — they always have the right to step
 * out of the employer-visible directory. Admin can also force a
 * leave via a separate path; this endpoint is for the trainee.
 *
 * Three things happen atomically when called
 *   1. Their most recent talent-application submission gets
 *      leftPoolAt + leftPoolReason stamped.
 *   2. If body.feedback is included, a PoolExitFeedback row is
 *      created with the survey responses (one per submission;
 *      a re-leave overwrites).
 *   3. If body.feedback is omitted but skipFeedback is true, we
 *      mint a FeedbackInvitation with a 30-day TTL and return
 *      its token so the UI can offer "fill in later". The
 *      invitation gets kind="exit_survey" so the form renders
 *      the right question set.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isExitReason, FEEDBACK_INVITE_TTL_DAYS, EXIT_REASONS,
} from "@/lib/talent-pool/comments";

export const runtime = "nodejs";

const TALENT_FORM_SLUG = "talent-application";

interface ExitFeedbackBody {
  helpfulness?: number | null;
  partnerQuality?: number | null;
  platformExperience?: number | null;
  communicationFreq?: number | null;
  npsScore?: number | null;
  foundJob?: boolean;
  jobSource?: string | null;
  whatWorkedWell?: string | null;
  whatToImprove?: string | null;
  additionalComments?: string | null;
  allowFollowUp?: boolean;
}

function clampScale(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(min, Math.min(max, Math.round(v)));
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    reason?: unknown;
    feedback?: ExitFeedbackBody;
    skipFeedback?: boolean;
  };

  if (!isExitReason(body.reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${EXIT_REASONS.join(", ")}` },
      { status: 400 },
    );
  }
  const reason = body.reason;

  // Most-recent submission for THIS user on the talent-application
  // form. Without one, there's nothing to mark — the trainee was
  // never in the pool.
  const submission = await prisma.eventFormSubmission.findFirst({
    where: {
      userId,
      form: { slug: TALENT_FORM_SLUG },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, reviewStatus: true, leftPoolAt: true },
  });
  if (!submission) {
    return NextResponse.json(
      { error: "You don't have a talent-application submission to leave." },
      { status: 404 },
    );
  }
  if (submission.leftPoolAt) {
    // Idempotent — return the existing leave state.
    return NextResponse.json({ ok: true, alreadyLeft: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.eventFormSubmission.update({
      where: { id: submission.id },
      data: { leftPoolAt: new Date(), leftPoolReason: reason },
    });

    let feedbackId: string | null = null;
    let invitationToken: string | null = null;

    if (body.feedback) {
      const fb = body.feedback;
      const created = await tx.poolExitFeedback.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          userId,
          reason,
          helpfulness:        clampScale(fb.helpfulness, 1, 10),
          partnerQuality:     clampScale(fb.partnerQuality, 1, 10),
          platformExperience: clampScale(fb.platformExperience, 1, 10),
          communicationFreq:  clampScale(fb.communicationFreq, 1, 10),
          npsScore:           clampScale(fb.npsScore, 0, 10),
          foundJob: !!fb.foundJob,
          jobSource: fb.jobSource?.toString().trim().slice(0, 500) || null,
          whatWorkedWell:     fb.whatWorkedWell?.toString().trim().slice(0, 4000) || null,
          whatToImprove:      fb.whatToImprove?.toString().trim().slice(0, 4000) || null,
          additionalComments: fb.additionalComments?.toString().trim().slice(0, 4000) || null,
          allowFollowUp: !!fb.allowFollowUp,
        },
        update: {
          reason,
          helpfulness:        clampScale(fb.helpfulness, 1, 10),
          partnerQuality:     clampScale(fb.partnerQuality, 1, 10),
          platformExperience: clampScale(fb.platformExperience, 1, 10),
          communicationFreq:  clampScale(fb.communicationFreq, 1, 10),
          npsScore:           clampScale(fb.npsScore, 0, 10),
          foundJob: !!fb.foundJob,
          jobSource: fb.jobSource?.toString().trim().slice(0, 500) || null,
          whatWorkedWell:     fb.whatWorkedWell?.toString().trim().slice(0, 4000) || null,
          whatToImprove:      fb.whatToImprove?.toString().trim().slice(0, 4000) || null,
          additionalComments: fb.additionalComments?.toString().trim().slice(0, 4000) || null,
          allowFollowUp: !!fb.allowFollowUp,
        },
      });
      feedbackId = created.id;
    } else if (body.skipFeedback) {
      // Mint a token so they can fill the survey later via
      // /feedback/[token]. Auto-issued invitations have null
      // invitedById to mark them as system-generated.
      const token = randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + FEEDBACK_INVITE_TTL_DAYS * 86_400_000);
      const inv = await tx.feedbackInvitation.create({
        data: {
          token,
          userId,
          invitedById: null,
          kind: "exit_survey",
          expiresAt,
        },
      });
      invitationToken = inv.token;
    }

    return { feedbackId, invitationToken };
  });

  return NextResponse.json({
    ok: true,
    feedbackId: result.feedbackId,
    invitationToken: result.invitationToken,
  });
}
