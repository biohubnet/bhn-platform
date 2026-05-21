/**
 * Master bullets — single bullet PATCH + DELETE.
 *
 *   PATCH  /api/profile/master/bullets/[id]
 *     body: any subset of bullet fields (body, tags, sectionKind,
 *           anchor*, position, isArchived)
 *     Writes a MasterBulletRevision when `body` changes (with the
 *     5-minute coalesce). The bullet's row is updated in place.
 *
 *   DELETE /api/profile/master/bullets/[id][?hard=true]
 *     Soft-archive by default (isArchived=true). ?hard=true does a
 *     real DELETE — revisions cascade.
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

/** Ensure the requested bullet exists AND belongs to the caller's
 *  master. Returns the bullet (with masterId.userId joined) or null. */
async function loadOwnedBullet(userId: string, bulletId: string) {
  return prisma.masterBullet.findFirst({
    where: { id: bulletId, master: { userId } },
    select: {
      id: true, masterId: true,
      sectionKind: true,
      anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
      body: true, tags: true, position: true, isArchived: true,
      sourceResumeId: true,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    body?: unknown;
    tags?: unknown;
    sectionKind?: unknown;
    anchorTitle?: unknown;
    anchorSubtitle?: unknown;
    anchorDateRange?: unknown;
    position?: unknown;
    isArchived?: unknown;
  };

  const existing = await loadOwnedBullet(userId, id);
  if (!existing) {
    return NextResponse.json({ error: "Bullet not found." }, { status: 404 });
  }

  // Build the update patch. Each field is optional — only fields
  // the caller sent end up in the patch object.
  const patch: Record<string, unknown> = {};
  let nextBody = existing.body;
  let nextTags = existing.tags;

  if (typeof body.body === "string") {
    const trimmed = body.body.trim();
    if (trimmed) {
      patch.body = trimmed;
      nextBody = trimmed;
    }
  }
  if (Array.isArray(body.tags)) {
    const clean = body.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
    patch.tags = clean;
    nextTags = clean;
  }
  if (typeof body.sectionKind === "string" && body.sectionKind.trim()) {
    patch.sectionKind = body.sectionKind.trim();
  }
  for (const k of ["anchorTitle", "anchorSubtitle", "anchorDateRange"] as const) {
    if (typeof body[k] === "string") {
      patch[k] = body[k] ? (body[k] as string).trim() || null : null;
    } else if (body[k] === null) {
      patch[k] = null;
    }
  }
  if (typeof body.position === "number" && Number.isFinite(body.position)) {
    patch.position = Math.max(0, Math.floor(body.position));
  }
  if (typeof body.isArchived === "boolean") {
    patch.isArchived = body.isArchived;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No patchable fields supplied." }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.masterBullet.update({
        where: { id },
        data: patch,
        select: {
          id: true, sectionKind: true,
          anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
          body: true, tags: true, position: true, isArchived: true,
          sourceResumeId: true, updatedAt: true,
        },
      });
      // If body changed → record a revision (coalesced).
      if (nextBody !== existing.body || nextTags.join("|") !== existing.tags.join("|")) {
        await recordMasterBulletRevision(tx, {
          bulletId: id,
          body: nextBody,
          tags: nextTags,
          source: "user_edit",
        });
      }
      return next;
    });

    return NextResponse.json({
      ok: true,
      bullet: { ...updated, updatedAt: updated.updatedAt.toISOString() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/profile/master/bullets/" + id + "] failed:", msg);
    return NextResponse.json(
      { error: `Couldn't update bullet — ${msg.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "unknown error"}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await loadOwnedBullet(userId, id);
  if (!existing) {
    return NextResponse.json({ error: "Bullet not found." }, { status: 404 });
  }

  const hard = new URL(req.url).searchParams.get("hard") === "true";
  if (hard) {
    await prisma.masterBullet.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: "hard" });
  }
  await prisma.masterBullet.update({
    where: { id },
    data: { isArchived: true },
  });
  return NextResponse.json({ ok: true, deleted: "archived" });
}
