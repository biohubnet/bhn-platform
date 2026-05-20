/**
 * Admin- or employer-authored comments on a talent-application
 * submission.
 *
 *   GET  /api/talent-pool/[sid]/comments
 *   POST /api/talent-pool/[sid]/comments  body: { body: string }
 *
 * Eligibility gate
 *   The submission MUST have reviewStatus in
 *   COMMENTABLE_REVIEW_STATUSES ("approved" / "approved_skip_review")
 *   before any new comment is accepted. Pending / rejected
 *   submissions can be viewed (their thread will be empty) but
 *   POST returns 409 with an explanation — surfaces the policy
 *   instead of silently dropping writes.
 *
 * Role gate
 *   Only admin / superadmin / employer / instructor can post; same
 *   roles can read. Trainees are never the audience here — their
 *   own application content lives in EventFormSubmission.data.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isCommentable, canComment, COMMENT_MAX_LENGTH,
} from "@/lib/talent-pool/comments";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sid: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "";
  if (!canComment(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sid } = await ctx.params;
  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: sid },
    select: { id: true, reviewStatus: true, eligibilityApprovedAt: true },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  // Eligibility gate — employers must not be able to read the
  // comment thread on a member who hasn't been eligibility-
  // approved. Admins / instructors keep full visibility.
  if (role === "employer" && !submission.eligibilityApprovedAt) {
    return NextResponse.json({ error: "Awaiting admin eligibility approval" }, { status: 403 });
  }

  const comments = await prisma.applicationComment.findMany({
    where: { submissionId: sid },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    commentable: isCommentable(submission.reviewStatus),
    reviewStatus: submission.reviewStatus,
    comments,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sid: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId || !canComment(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sid } = await ctx.params;
  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: sid },
    select: { id: true, reviewStatus: true, eligibilityApprovedAt: true },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  // Eligibility gate — employers cannot post comments on a member
  // who hasn't been eligibility-approved. Admins / instructors can
  // (they're the ones collaborating on the approval decision).
  if (role === "employer" && !submission.eligibilityApprovedAt) {
    return NextResponse.json(
      { error: "Awaiting admin eligibility approval", code: "eligibility_required" },
      { status: 403 },
    );
  }

  if (!isCommentable(submission.reviewStatus)) {
    return NextResponse.json(
      {
        error: "Commenting is locked until the submission's eligibility has been reviewed and approved by an admin.",
        code: "review_required",
        reviewStatus: submission.reviewStatus,
      },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { body?: unknown };
  if (typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const text = body.body.trim().slice(0, COMMENT_MAX_LENGTH);

  const comment = await prisma.applicationComment.create({
    data: {
      submissionId: sid,
      authorId: userId,
      authorRole: role,
      body: text,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, comment }, { status: 201 });
}
