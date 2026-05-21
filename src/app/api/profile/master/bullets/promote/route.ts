/**
 * Promote a resume-side bullet edit back into the master library.
 *
 *   POST /api/profile/master/bullets/promote
 *     body: { masterBulletId, body, tags?,
 *             source?: "promoted_from_resume" }
 *
 * Updates the master bullet's body (and optionally tags) and records
 * a coalesced MasterBulletRevision with source="promoted_from_resume"
 * so the history makes it clear the change came from a tailored
 * resume, not from in-place editing on /profile/master.
 *
 * Ownership: the master bullet must belong to the caller. Body is
 * required + non-empty.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordMasterBulletRevision } from "@/lib/resume/master";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    masterBulletId?: unknown;
    body?: unknown;
    tags?: unknown;
  };
  const masterBulletId = typeof body.masterBulletId === "string" ? body.masterBulletId : null;
  const newBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!masterBulletId) {
    return NextResponse.json({ error: "masterBulletId required" }, { status: 400 });
  }
  if (!newBody) {
    return NextResponse.json({ error: "body required (non-empty)" }, { status: 400 });
  }

  const existing = await prisma.masterBullet.findFirst({
    where: { id: masterBulletId, master: { userId } },
    select: { id: true, body: true, tags: true, isArchived: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Master bullet not found." }, { status: 404 });
  }
  if (existing.isArchived) {
    return NextResponse.json({ error: "Master bullet is archived — restore it before promoting an edit." }, { status: 400 });
  }

  // Tags default to the bullet's existing tags so callers that only
  // care about the body don't have to round-trip them. Cap at 20 to
  // mirror the create/PATCH endpoints' guardrail.
  const nextTags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20)
    : existing.tags;

  // No-op early exit: if the body + tags are unchanged, don't write a
  // revision row. The chip's promote button shouldn't show in this
  // case, but defending the endpoint against a stale client keeps the
  // history clean.
  if (newBody === existing.body && nextTags.join("|") === existing.tags.join("|")) {
    return NextResponse.json({
      ok: true,
      bullet: {
        id: existing.id,
        body: existing.body,
        tags: existing.tags,
        unchanged: true,
      },
    });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.masterBullet.update({
        where: { id: masterBulletId },
        data: { body: newBody, tags: nextTags },
        select: {
          id: true, body: true, tags: true,
          sectionKind: true,
          anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
          position: true, sourceResumeId: true, updatedAt: true,
        },
      });
      await recordMasterBulletRevision(tx, {
        bulletId: masterBulletId,
        body: newBody,
        tags: nextTags,
        source: "promoted_from_resume",
      });
      return next;
    });

    return NextResponse.json({
      ok: true,
      bullet: { ...updated, updatedAt: updated.updatedAt.toISOString() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/profile/master/bullets/promote] failed:", msg);
    return NextResponse.json(
      { error: `Couldn't promote — ${msg.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "unknown error"}` },
      { status: 500 },
    );
  }
}
