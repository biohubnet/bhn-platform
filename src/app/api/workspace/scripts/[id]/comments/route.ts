/**
 * Comments on one script (admin side). Supports anchored ranges, edits, and
 * threaded replies.
 *   GET    …/comments                         → list (incl. anchor + edit meta)
 *   POST   …/comments  { body, parentId?, anchorSectionId?, anchorFrom?,
 *                        anchorTo?, anchorQuote? }                    → add
 *   PATCH  …/comments  { commentId, status? , body? }  → resolve/reopen OR edit
 *   DELETE …/comments?commentId=…                                    → remove
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

const SELECT = {
  id: true, body: true, authorName: true, authorKind: true, status: true, parentId: true,
  anchorSectionId: true, anchorFrom: true, anchorTo: true, anchorQuote: true,
  editCount: true, editedAt: true, createdAt: true,
} as const;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const comments = await prisma.scriptComment.findMany({
    where: { scriptId: id }, orderBy: { createdAt: "asc" }, take: 800, select: SELECT,
  });
  return NextResponse.json({ ok: true, comments, canModerate: true });
}

const Body = z.object({
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().optional(),
  anchorSectionId: z.string().max(60).optional(),
  anchorFrom: z.number().int().min(0).optional(),
  anchorTo: z.number().int().min(0).optional(),
  anchorQuote: z.string().max(600).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  const d = parsed.data;
  const comment = await prisma.scriptComment.create({
    data: {
      scriptId: id,
      body: d.body,
      parentId: d.parentId ?? null,
      anchorSectionId: d.anchorSectionId ?? null,
      anchorFrom: d.anchorFrom ?? null,
      anchorTo: d.anchorTo ?? null,
      anchorQuote: d.anchorQuote ?? null,
      authorUserId: (session.user as { id?: string }).id ?? null,
      authorName: (session.user as { name?: string }).name ?? "Admin",
      authorKind: "user",
      status: "open",
    },
    select: SELECT,
  });
  return NextResponse.json({ ok: true, comment });
}

const Patch = z.object({
  commentId: z.string().min(1),
  status: z.enum(["open", "resolved"]).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.body) { data.body = parsed.data.body; data.editedAt = new Date(); data.editCount = { increment: 1 }; }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  await prisma.scriptComment.updateMany({ where: { id: parsed.data.commentId, scriptId: id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const commentId = new URL(req.url).searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required." }, { status: 400 });
  // Delete the comment and any replies to it.
  await prisma.scriptComment.deleteMany({ where: { scriptId: id, OR: [{ id: commentId }, { parentId: commentId }] } });
  return NextResponse.json({ ok: true });
}
