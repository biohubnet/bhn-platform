/**
 * Live-presence heartbeat for collaborative script editing (admin-only).
 *   POST /api/workspace/scripts/[id]/presence
 *     body: { editorKey, name, color, activeSid, recentSids[] }
 *   → upserts this editor's presence and returns the OTHER editors currently
 *     active on the script (seen within the last ~12s). One round-trip does
 *     both the heartbeat and the poll.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

const ONLINE_MS = 12_000; // "online" if seen within 12s
const SWEEP_MS = 120_000; // drop rows not seen for 2 min

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: scriptId } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    editorKey?: string; name?: string; color?: string; activeSid?: string | null; recentSids?: string[];
  };
  const editorKey = (body.editorKey ?? (session.user as { id?: string }).id ?? "").slice(0, 80);
  if (!editorKey) return NextResponse.json({ error: "editorKey required" }, { status: 400 });
  const name = (body.name ?? (session.user as { name?: string }).name ?? "Someone").slice(0, 80);
  const color = (body.color ?? "#3b82f6").slice(0, 16);
  const activeSid = body.activeSid ? String(body.activeSid).slice(0, 60) : null;
  const recentSids = Array.isArray(body.recentSids)
    ? body.recentSids.slice(0, 30).map(String).join(",").slice(0, 600)
    : "";
  const now = new Date();

  await prisma.scriptPresence.upsert({
    where: { scriptId_editorKey: { scriptId, editorKey } },
    update: { name, color, activeSid, recentSids, lastSeenAt: now },
    create: { scriptId, editorKey, name, color, activeSid, recentSids, lastSeenAt: now },
  });

  // Sweep ancient rows (fire-and-forget).
  prisma.scriptPresence
    .deleteMany({ where: { scriptId, lastSeenAt: { lt: new Date(now.getTime() - SWEEP_MS) } } })
    .catch(() => {});

  const rows = await prisma.scriptPresence.findMany({
    where: { scriptId, editorKey: { not: editorKey }, lastSeenAt: { gte: new Date(now.getTime() - ONLINE_MS) } },
    select: { editorKey: true, name: true, color: true, activeSid: true, recentSids: true },
  });
  const peers = rows.map((r) => ({
    editorKey: r.editorKey,
    name: r.name,
    color: r.color,
    activeSid: r.activeSid,
    recentSids: r.recentSids ? r.recentSids.split(",").filter(Boolean) : [],
  }));

  return NextResponse.json({ ok: true, peers });
}
