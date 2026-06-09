/**
 * Revision history for one script (admin-only).
 *   GET  /api/workspace/scripts/[id]/revisions  → recent revisions (who/when)
 *   POST /api/workspace/scripts/[id]/revisions  → { restoreId } restores one
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revertToRevision } from "@/lib/scripts/content";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const revisions = await prisma.scriptRevision.findMany({
    where: { scriptId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, authorName: true, authorKind: true, summary: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, revisions });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const name = (session.user as { name?: string }).name ?? "Admin";
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { restoreId?: string };
  if (!body.restoreId) return NextResponse.json({ error: "restoreId required." }, { status: 400 });

  const snapshot = await revertToRevision({
    scriptId: id,
    revisionId: body.restoreId,
    author: { userId: uid, name, kind: "user" },
  }).catch(() => null);
  if (!snapshot) return NextResponse.json({ error: "Restore failed." }, { status: 400 });
  return NextResponse.json({ ok: true, snapshot });
}
