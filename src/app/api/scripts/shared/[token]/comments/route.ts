/**
 * Comments on a script via its public share link (anonymous collaborators).
 * Supports anchored ranges, edits, and threaded replies; deletion stays
 * admin-only (handled on the workspace route).
 *   GET   …/comments  → list
 *   POST  …/comments  { body, parentId?, anchor* } → add (must have joined)
 *   PATCH …/comments  { commentId, status?, body? } → resolve/reopen OR edit
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveShareToken, getCollaborator } from "@/lib/scripts/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

const SELECT = {
  id: true, body: true, authorName: true, authorKind: true, status: true, parentId: true,
  anchorSectionId: true, anchorFrom: true, anchorTo: true, anchorQuote: true,
  editCount: true, editedAt: true, createdAt: true,
} as const;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const comments = await prisma.scriptComment.findMany({
    where: { scriptId: res.script.id }, orderBy: { createdAt: "asc" }, take: 800, select: SELECT,
  });
  return NextResponse.json({ ok: true, comments, canModerate: false });
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
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Join the script first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  const d = parsed.data;
  const comment = await prisma.scriptComment.create({
    data: {
      scriptId: res.script.id,
      body: d.body,
      parentId: d.parentId ?? null,
      anchorSectionId: d.anchorSectionId ?? null,
      anchorFrom: d.anchorFrom ?? null,
      anchorTo: d.anchorTo ?? null,
      anchorQuote: d.anchorQuote ?? null,
      authorUserId: collab.convertedUserId ?? null,
      authorName: collab.name,
      authorKind: "anon",
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
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Join the script first." }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.body) { data.body = parsed.data.body; data.editedAt = new Date(); data.editCount = { increment: 1 }; }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  await prisma.scriptComment.updateMany({ where: { id: parsed.data.commentId, scriptId: res.script.id }, data });
  return NextResponse.json({ ok: true });
}
