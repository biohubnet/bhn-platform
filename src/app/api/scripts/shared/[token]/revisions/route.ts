/**
 * Public (no login) revision history for a shared script.
 *   GET  /api/scripts/shared/[token]/revisions                → list (who/when)
 *   POST /api/scripts/shared/[token]/revisions { restoreId }  → restore one
 * Restore needs an edit link + the collaborator cookie; the restore itself is
 * recorded as a new revision attributed to that collaborator.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveShareToken, getCollaborator } from "@/lib/scripts/share";
import { revertToRevision } from "@/lib/scripts/content";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  const revisions = await prisma.scriptRevision.findMany({
    where: { scriptId: res.script.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, authorName: true, authorKind: true, summary: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, revisions });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  if (!res.token.canEdit) return NextResponse.json({ error: "This link is view-only." }, { status: 403 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Please join with your name first." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { restoreId?: string };
  if (!body.restoreId) return NextResponse.json({ error: "restoreId required." }, { status: 400 });

  const snapshot = await revertToRevision({
    scriptId: res.script.id,
    revisionId: body.restoreId,
    author: { userId: null, name: collab.name, kind: "anon" },
  }).catch(() => null);
  if (!snapshot) return NextResponse.json({ error: "Restore failed." }, { status: 400 });
  return NextResponse.json({ ok: true, snapshot });
}
