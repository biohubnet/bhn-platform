/**
 * Resume comment status update.
 *
 *   PATCH /api/resume/[userId]/comments/[id]   body: { status: "open" | "resolved" | "applied" }
 *
 * Status moves are owner-only — only the trainee marks a comment
 * resolved or applied. Anyone with read access on the resume can
 * GET the comments; only the trainee changes their state.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_STATUSES = ["open", "resolved", "applied"] as const;
type CommentStatus = (typeof ALLOWED_STATUSES)[number];

interface RouteCtx { params: Promise<{ userId: string; id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = (session.user as { id?: string }).id ?? null;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: ownerId, id: commentId } = await ctx.params;
  if (me !== ownerId) {
    return NextResponse.json(
      { error: "Only the resume owner can change a comment's status." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const status = typeof body.status === "string" && (ALLOWED_STATUSES as readonly string[]).includes(body.status)
    ? (body.status as CommentStatus)
    : null;
  if (!status) {
    return NextResponse.json(
      { error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Confirm the comment belongs to this owner's resume before mutating
  // — defends against URL-tampering across users.
  const comment = await prisma.resumeComment.findUnique({
    where: { id: commentId },
    include: { resume: { select: { userId: true } } },
  });
  if (!comment || comment.resume.userId !== ownerId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const updated = await prisma.resumeComment.update({
    where: { id: commentId },
    data: { status },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
  });
  return NextResponse.json({ ok: true, comment: updated });
}
