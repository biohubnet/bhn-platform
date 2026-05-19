/**
 * Talent-application comments — list + create.
 *
 *   GET  /api/employer/applicants/[submissionId]/comments
 *     Returns every comment on this submission, oldest first.
 *
 *   POST /api/employer/applicants/[submissionId]/comments
 *     body: { body: string }
 *     Creates a comment. `authorRole` is captured at write time so
 *     the thread keeps the role context even if the author's role
 *     changes later (matches the schema's design intent).
 *
 * Allowed authors: admin, superadmin, employer, instructor. The
 * EventFormSubmission model is the source of truth for who can see
 * a submission; on this platform employer + admin roles can read
 * + write talent-application comments.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCommentable } from "@/lib/talent-pool/comments";

export const runtime = "nodejs";

const MAX_BODY = 4000;
const ALLOWED_ROLES = ["admin", "superadmin", "employer", "instructor"] as const;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "";
  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { submissionId } = await ctx.params;
  const comments = await prisma.applicationComment.findMany({
    where: { submissionId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    comments: comments.map((c) => ({
      id: c.id,
      authorName: c.author.name ?? c.author.email,
      authorRole: c.authorRole,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { submissionId } = await ctx.params;
  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, reviewStatus: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Server-side eligibility gate — the UI already shows a
  // "Commenting locked" panel when the submission isn't approved,
  // but the previous version of this handler didn't enforce it
  // server-side. A motivated employer could bypass the disabled
  // textarea via dev tools or hit this endpoint directly with
  // curl/fetch. Lock now matches what the UI promises: comments
  // are only writable once an admin manually ticks the
  // submission as approved (reviewStatus → "approved" or
  // "approved_skip_review").
  if (!isCommentable(submission.reviewStatus)) {
    return NextResponse.json(
      {
        error:
          "Commenting is locked until an admin approves this applicant's eligibility.",
        code: "not_commentable",
        reviewStatus: submission.reviewStatus,
      },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { body?: string };
  const text =
    typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";
  if (text.length < 1) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  const created = await prisma.applicationComment.create({
    data: {
      submissionId,
      authorId: userId,
      authorRole: role,
      body: text,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: created.id,
      authorName: created.author.name ?? created.author.email,
      authorRole: created.authorRole,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  });
}
