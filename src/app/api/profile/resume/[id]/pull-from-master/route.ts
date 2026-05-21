/**
 * Pull a bullet from the user's master library into a specific resume.
 *
 *   POST /api/profile/resume/[id]/pull-from-master
 *     body: { masterBulletId, targetSectionId, targetItemId, position? }
 *
 * Loads the resume's content tree, splices a copy of the master
 * bullet into the requested (section, item) at the given position
 * (or appends when no position is supplied), tags the inserted
 * bullet with `derivedFromMasterBulletId` + a snapshot of the master
 * body, then writes the updated content + bumps the resume version
 * and snapshots a revision. Returns the new content so the editor
 * can replace its local state without an extra round-trip.
 *
 * Ownership: the caller must own both the resume AND the master
 * bullet — cross-user pulls return 404.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResumeContent, ResumeBullet } from "@/lib/resume/types";
import { rid } from "@/lib/resume/types";
import { recordRevision } from "@/lib/resume/revisions";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: resumeId } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    masterBulletId?: unknown;
    targetSectionId?: unknown;
    targetItemId?: unknown;
    position?: unknown;
  };
  const masterBulletId = typeof body.masterBulletId === "string" ? body.masterBulletId : null;
  const targetSectionId = typeof body.targetSectionId === "string" ? body.targetSectionId : null;
  const targetItemId = typeof body.targetItemId === "string" ? body.targetItemId : null;
  const position = typeof body.position === "number" && Number.isFinite(body.position)
    ? Math.max(0, Math.floor(body.position))
    : null;

  if (!masterBulletId || !targetSectionId || !targetItemId) {
    return NextResponse.json(
      { error: "masterBulletId, targetSectionId, targetItemId all required" },
      { status: 400 },
    );
  }

  // Load resume + verify ownership. Reading from the persisted row is
  // load-bearing — the editor flushes its in-flight auto-save before
  // calling this endpoint, so the content here is the source of truth.
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    select: { id: true, content: true, version: true },
  });
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  // Load master bullet + verify ownership via the master → user join.
  // Archived bullets are excluded from the pull surface in the
  // drawer; if a stale id slips through (older drawer state), the
  // 404 here keeps the resume tree clean.
  const masterBullet = await prisma.masterBullet.findFirst({
    where: { id: masterBulletId, master: { userId }, isArchived: false },
    select: { id: true, body: true },
  });
  if (!masterBullet) {
    return NextResponse.json({ error: "Master bullet not found" }, { status: 404 });
  }

  const content = resume.content as unknown as ResumeContent;
  if (!content || !Array.isArray(content.sections)) {
    return NextResponse.json({ error: "Resume content is empty or malformed" }, { status: 400 });
  }
  const section = content.sections.find((s) => s.id === targetSectionId);
  if (!section) {
    return NextResponse.json({ error: "Target section not found" }, { status: 400 });
  }
  const item = section.items.find((it) => it.id === targetItemId);
  if (!item) {
    return NextResponse.json({ error: "Target item not found" }, { status: 400 });
  }

  const newBullet: ResumeBullet = {
    id: rid(),
    position: 0, // re-stamped after splice
    body: masterBullet.body,
    derivedFromMasterBulletId: masterBullet.id,
    derivedFromMasterBody: masterBullet.body,
  };

  const nextBullets = [...item.bullets];
  const pos = position === null ? nextBullets.length : Math.min(position, nextBullets.length);
  nextBullets.splice(pos, 0, newBullet);
  const stamped = nextBullets.map((b, i) => ({ ...b, position: i }));

  const nextContent: ResumeContent = {
    ...content,
    sections: content.sections.map((s) =>
      s.id === targetSectionId
        ? {
            ...s,
            items: s.items.map((it) =>
              it.id === targetItemId ? { ...it, bullets: stamped } : it,
            ),
          }
        : s,
    ),
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.resume.update({
        where: { id: resume.id },
        data: {
          content: nextContent as unknown as object,
          version: { increment: 1 },
          lastEditedAt: new Date(),
        },
        select: { id: true, version: true },
      });
      await recordRevision(tx, {
        resumeId: r.id,
        version: r.version,
        content: nextContent as unknown as object,
        triggeredBy: "user",
        note: "Pulled bullet from master library",
      });
      return r;
    });

    return NextResponse.json({
      ok: true,
      resume: {
        id: updated.id,
        version: updated.version,
        content: nextContent,
      },
      insertedBulletId: newBullet.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/profile/resume/" + resumeId + "/pull-from-master] failed:", msg);
    return NextResponse.json(
      { error: `Couldn't pull bullet — ${msg.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "unknown error"}` },
      { status: 500 },
    );
  }
}
