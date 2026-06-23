/**
 * Comments on a script via its public share link (anonymous collaborators).
 *   GET   /api/scripts/shared/[token]/comments  → list (anyone with the link)
 *   POST  /api/scripts/shared/[token]/comments  → { body, parentId? } add (must have joined)
 *   PATCH /api/scripts/shared/[token]/comments  → { commentId, status } resolve/reopen
 * Authorship comes from the per-script collaborator cookie. Deletion is
 * admin-only (handled on the workspace route), not exposed here.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveShareToken, getCollaborator } from "@/lib/scripts/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

const SELECT = { id: true, body: true, authorName: true, authorKind: true, status: true, parentId: true, createdAt: true } as const;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const comments = await prisma.scriptComment.findMany({
    where: { scriptId: res.script.id }, orderBy: { createdAt: "asc" }, take: 500, select: SELECT,
  });
  return NextResponse.json({ ok: true, comments, canModerate: false });
}

const Body = z.object({ body: z.string().trim().min(1).max(4000), parentId: z.string().optional() });

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Join the script first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  const comment = await prisma.scriptComment.create({
    data: {
      scriptId: res.script.id,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
      authorUserId: collab.convertedUserId ?? null,
      authorName: collab.name,
      authorKind: "anon",
      status: "open",
    },
    select: SELECT,
  });
  return NextResponse.json({ ok: true, comment });
}

const Patch = z.object({ commentId: z.string().min(1), status: z.enum(["open", "resolved"]) });

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Join the script first." }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  await prisma.scriptComment.updateMany({
    where: { id: parsed.data.commentId, scriptId: res.script.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
