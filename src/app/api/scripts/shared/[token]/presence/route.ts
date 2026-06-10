/**
 * Public (no login) presence heartbeat for a shared script — the anonymous
 * twin of /api/workspace/scripts/[id]/presence. Identity comes from the
 * collaborator cookie (never from the request body), so a guest can't
 * impersonate anyone; the token scopes everything to one script.
 *   POST /api/scripts/shared/[token]/presence { color, activeSid, recentSids[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveShareToken, getCollaborator } from "@/lib/scripts/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

const ONLINE_MS = 12_000;
const SWEEP_MS = 120_000;

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  const collab = await getCollaborator(res.script.id);
  if (!collab) return NextResponse.json({ error: "Join first." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    color?: string; activeSid?: string | null; recentSids?: string[];
  };
  const scriptId = res.script.id;
  const editorKey = collab.id;
  const color = (body.color ?? "#3b82f6").slice(0, 16);
  const activeSid = body.activeSid ? String(body.activeSid).slice(0, 60) : null;
  const recentSids = Array.isArray(body.recentSids)
    ? body.recentSids.slice(0, 30).map(String).join(",").slice(0, 600)
    : "";
  const now = new Date();

  await prisma.scriptPresence.upsert({
    where: { scriptId_editorKey: { scriptId, editorKey } },
    update: { name: collab.name, color, activeSid, recentSids, lastSeenAt: now },
    create: { scriptId, editorKey, name: collab.name, color, activeSid, recentSids, lastSeenAt: now },
  });

  prisma.scriptPresence
    .deleteMany({ where: { scriptId, lastSeenAt: { lt: new Date(now.getTime() - SWEEP_MS) } } })
    .catch(() => {});

  const rows = await prisma.scriptPresence.findMany({
    where: { scriptId, editorKey: { not: editorKey }, lastSeenAt: { gte: new Date(now.getTime() - ONLINE_MS) } },
    select: { editorKey: true, name: true, color: true, activeSid: true, recentSids: true },
    orderBy: { editorKey: "asc" },
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
