/**
 * Comments on one script (admin side).
 *   GET    /api/workspace/scripts/[id]/comments         → list
 *   POST   /api/workspace/scripts/[id]/comments         → { body, parentId? } add
 *   PATCH  /api/workspace/scripts/[id]/comments         → { commentId, status } resolve/reopen
 *   DELETE /api/workspace/scripts/[id]/comments?commentId=… → remove (admin moderation)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

const SELECT = { id: true, body: true, authorName: true, authorKind: true, status: true, parentId: true, createdAt: true } as const;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const comments = await prisma.scriptComment.findMany({
    where: { scriptId: id }, orderBy: { createdAt: "asc" }, take: 500, select: SELECT,
  });
  return NextResponse.json({ ok: true, comments, canModerate: true });
}

const Body = z.object({ body: z.string().trim().min(1).max(4000), parentId: z.string().optional() });

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  const comment = await prisma.scriptComment.create({
    data: {
      scriptId: id,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
      authorUserId: (session.user as { id?: string }).id ?? null,
      authorName: (session.user as { name?: string }).name ?? "Admin",
      authorKind: "user",
      status: "open",
    },
    select: SELECT,
  });
  return NextResponse.json({ ok: true, comment });
}

const Patch = z.object({ commentId: z.string().min(1), status: z.enum(["open", "resolved"]) });

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  await prisma.scriptComment.updateMany({
    where: { id: parsed.data.commentId, scriptId: id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const commentId = new URL(req.url).searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required." }, { status: 400 });
  await prisma.scriptComment.deleteMany({ where: { id: commentId, scriptId: id } });
  return NextResponse.json({ ok: true });
}
