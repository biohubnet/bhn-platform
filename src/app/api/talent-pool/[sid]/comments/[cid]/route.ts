/**
 * Delete a single comment.
 *
 *   DELETE /api/talent-pool/[sid]/comments/[cid]
 *
 * Allowed callers
 *   • The comment's author (any role with canComment())
 *   • An admin / superadmin (regardless of authorship — moderation)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ sid: string; cid: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";

  const { sid, cid } = await ctx.params;
  const comment = await prisma.applicationComment.findUnique({
    where: { id: cid },
    select: { id: true, submissionId: true, authorId: true },
  });
  if (!comment || comment.submissionId !== sid) {
    return NextResponse.json({ error: "Comment not found on that submission" }, { status: 404 });
  }

  const isAuthor = comment.authorId === userId;
  const isAdmin = role === "admin" || role === "superadmin";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.applicationComment.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}
