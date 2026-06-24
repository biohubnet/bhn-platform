/**
 * Master bullets — POST (create) + bulk-promote.
 *
 *   POST /api/profile/master/bullets
 *     body: { sectionKind, anchorTitle?, anchorSubtitle?,
 *             anchorDateRange?, body, tags? }
 *     Creates a new bullet in the calling user's master. Auto-
 *     positioned at the end of its (section, anchor) group.
 *
 * Bullet edit / archive / hard-delete live at /[id]/route.ts.
 * Promote-from-resume lives at /promote/route.ts (next step).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster } from "@/lib/resume/master";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

/**
 * DELETE /api/profile/master/bullets?all=1
 * Clears the WHOLE library — every bullet (active + archived) and its
 * revision history (cascade). The contact header and saved snapshots
 * are deliberately kept. Requires the explicit ?all=1 guard so a stray
 * call can't wipe the library; the UI confirms first (destructive tone).
 */
export async function DELETE(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = new URL(req.url).searchParams.get("all");
  if (all !== "1" && all !== "true") {
    return NextResponse.json({ error: "Pass ?all=1 to clear the whole library." }, { status: 400 });
  }
  const master = await getOrCreateMaster(prisma, userId);
  const res = await prisma.masterBullet.deleteMany({ where: { masterId: master.id } });
  return NextResponse.json({ ok: true, deleted: res.count });
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    sectionKind?: unknown;
    anchorTitle?: unknown;
    anchorSubtitle?: unknown;
    anchorDateRange?: unknown;
    body?: unknown;
    tags?: unknown;
    sourceResumeId?: unknown;
  };
  const sectionKind = typeof body.sectionKind === "string" && body.sectionKind.trim()
    ? body.sectionKind.trim()
    : null;
  const bulletBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!sectionKind) {
    return NextResponse.json({ error: "sectionKind required" }, { status: 400 });
  }
  if (!bulletBody) {
    return NextResponse.json({ error: "body required (non-empty)" }, { status: 400 });
  }

  const master = await getOrCreateMaster(prisma, userId);

  // Position = max(position) + 1 within the same (section, anchor)
  // group, so new bullets always land at the end.
  const anchorTitle    = typeof body.anchorTitle    === "string" ? body.anchorTitle.trim()    || null : null;
  const anchorSubtitle = typeof body.anchorSubtitle === "string" ? body.anchorSubtitle.trim() || null : null;
  const anchorDateRange = typeof body.anchorDateRange === "string" ? body.anchorDateRange.trim() || null : null;
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean).slice(0, 20)
    : [];
  const sourceResumeId = typeof body.sourceResumeId === "string" ? body.sourceResumeId : null;

  const maxPosition = await prisma.masterBullet.aggregate({
    where: {
      masterId: master.id,
      sectionKind,
      anchorTitle,
    },
    _max: { position: true },
  });
  const nextPosition = (maxPosition._max.position ?? -1) + 1;

  try {
    const created = await prisma.masterBullet.create({
      data: {
        masterId: master.id,
        sectionKind,
        anchorTitle,
        anchorSubtitle,
        anchorDateRange,
        body: bulletBody,
        tags,
        position: nextPosition,
        sourceResumeId,
      },
      select: {
        id: true, sectionKind: true,
        anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
        body: true, tags: true, position: true, sourceResumeId: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      ok: true,
      bullet: { ...created, updatedAt: created.updatedAt.toISOString() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/profile/master/bullets] create failed:", msg);
    return NextResponse.json(
      { error: `Couldn't create bullet — ${msg.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "unknown error"}` },
      { status: 500 },
    );
  }
}
