/**
 * Submit feedback via a one-shot invitation token.
 *
 *   GET  /api/feedback/[token]   → validity + form metadata
 *   POST /api/feedback/[token]   → submit responses, mark consumed
 *
 * GET is unauthenticated so the public /feedback/[token] page can
 * fetch invite metadata before rendering. POST requires session
 * IF the invite was user-scoped (invitation.userId set) — that
 * way only the intended user can use a targeted link even if the
 * URL is shared.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isExitReason, EXIT_REASONS } from "@/lib/talent-pool/comments";

export const runtime = "nodejs";

function clampScale(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(min, Math.min(max, Math.round(v)));
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const inv = await prisma.feedbackInvitation.findUnique({
    where: { token },
    include: {
      user:      { select: { id: true, name: true, email: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!inv) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (inv.consumedAt) {
    return NextResponse.json({ error: "This invitation has already been used.", code: "consumed" }, { status: 410 });
  }
  if (inv.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invitation has expired.", code: "expired" }, { status: 410 });
  }
  return NextResponse.json({
    ok: true,
    invitation: {
      id: inv.id,
      kind: inv.kind,
      message: inv.message,
      expiresAt: inv.expiresAt.toISOString(),
      targetUserName: inv.user?.name ?? null,
      requiresLogin: inv.userId !== null,
      invitedByName: inv.invitedBy?.name ?? null,
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const inv = await prisma.feedbackInvitation.findUnique({ where: { token } });
  if (!inv) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (inv.consumedAt) {
    return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  }
  if (inv.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  // Targeted invites require the matching session.
  let userId: string | null = inv.userId;
  if (inv.userId) {
    const session = await getSession();
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (sessionUserId !== inv.userId) {
      return NextResponse.json(
        { error: "This invitation is for a specific BHN account. Sign in as that user to continue." },
        { status: 403 },
      );
    }
    userId = sessionUserId;
  } else {
    // Open invite — use the current session's user id if available
    // so we can still link the feedback to a person; null is okay
    // for fully-anonymous submissions.
    const session = await getSession();
    userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // If this is an exit survey we still need a reason; non-exit
  // kinds can omit it (we store "other" as a benign default).
  let reason: string;
  if (inv.kind === "exit_survey") {
    if (!isExitReason(body.reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${EXIT_REASONS.join(", ")}` },
        { status: 400 },
      );
    }
    reason = body.reason;
  } else {
    reason = typeof body.reason === "string" && isExitReason(body.reason) ? body.reason : "other";
  }

  // The exit-survey row needs a submission to attach to. For an
  // open invite without a logged-in user we have no submission FK
  // available; in that case we mint a stand-alone FeedbackInvitation
  // record and skip the PoolExitFeedback row (the responses still
  // live on the invitation via the metadata block we attach to its
  // consumedAt update). For our v1, we require a userId + an
  // existing talent-application submission for the exit-survey
  // kind. Other kinds (post_completion, nps_check, custom) accept
  // anonymous and skip the PoolExitFeedback insert.
  let feedbackId: string | null = null;

  if (inv.kind === "exit_survey") {
    if (!userId) {
      return NextResponse.json(
        { error: "Exit-survey feedback requires sign-in." },
        { status: 401 },
      );
    }
    const submission = await prisma.eventFormSubmission.findFirst({
      where: { userId, form: { slug: "talent-application" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!submission) {
      return NextResponse.json(
        { error: "No talent-application submission to attach feedback to." },
        { status: 404 },
      );
    }

    const created = await prisma.poolExitFeedback.upsert({
      where: { submissionId: submission.id },
      create: {
        submissionId: submission.id,
        userId,
        reason,
        helpfulness:        clampScale(body.helpfulness, 1, 10),
        partnerQuality:     clampScale(body.partnerQuality, 1, 10),
        platformExperience: clampScale(body.platformExperience, 1, 10),
        communicationFreq:  clampScale(body.communicationFreq, 1, 10),
        npsScore:           clampScale(body.npsScore, 0, 10),
        foundJob: !!body.foundJob,
        jobSource: typeof body.jobSource === "string" ? body.jobSource.trim().slice(0, 500) || null : null,
        whatWorkedWell:     typeof body.whatWorkedWell === "string" ? body.whatWorkedWell.trim().slice(0, 4000) || null : null,
        whatToImprove:      typeof body.whatToImprove === "string" ? body.whatToImprove.trim().slice(0, 4000) || null : null,
        additionalComments: typeof body.additionalComments === "string" ? body.additionalComments.trim().slice(0, 4000) || null : null,
        allowFollowUp: !!body.allowFollowUp,
      },
      update: {
        reason,
        helpfulness:        clampScale(body.helpfulness, 1, 10),
        partnerQuality:     clampScale(body.partnerQuality, 1, 10),
        platformExperience: clampScale(body.platformExperience, 1, 10),
        communicationFreq:  clampScale(body.communicationFreq, 1, 10),
        npsScore:           clampScale(body.npsScore, 0, 10),
        foundJob: !!body.foundJob,
        jobSource: typeof body.jobSource === "string" ? body.jobSource.trim().slice(0, 500) || null : null,
        whatWorkedWell:     typeof body.whatWorkedWell === "string" ? body.whatWorkedWell.trim().slice(0, 4000) || null : null,
        whatToImprove:      typeof body.whatToImprove === "string" ? body.whatToImprove.trim().slice(0, 4000) || null : null,
        additionalComments: typeof body.additionalComments === "string" ? body.additionalComments.trim().slice(0, 4000) || null : null,
        allowFollowUp: !!body.allowFollowUp,
      },
    });
    feedbackId = created.id;
  }

  await prisma.feedbackInvitation.update({
    where: { id: inv.id },
    data: { consumedAt: new Date(), feedbackId },
  });

  return NextResponse.json({ ok: true, feedbackId });
}
