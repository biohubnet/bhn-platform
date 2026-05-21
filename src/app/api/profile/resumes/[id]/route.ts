/**
 * Per-resume mutations (self-only).
 *
 *   PATCH  /api/profile/resumes/[id]
 *     body: { name?: string; isArchived?: boolean }
 *
 *   DELETE /api/profile/resumes/[id]      → soft-archive
 *     (We never hard-delete a resume here. Drop the row directly in
 *     the DB if you genuinely need it gone — admin task, not a user
 *     action. Soft-archive keeps comments + revisions intact for
 *     restore later.)
 *
 * Multi-resume aware: the unique constraint on userId was lifted in
 * the 20260706 migration, so renames + archives are safe for any
 * resume the user owns.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteCtx { params: Promise<{ id: string }> }

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

async function loadOwned(userId: string, id: string) {
  const r = await prisma.resume.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!r || r.userId !== userId) return null;
  return r;
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const owned = await loadOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    isArchived?: unknown;
  };
  const data: { name?: string; isArchived?: boolean } = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 120);
    if (!trimmed) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (typeof body.isArchived === "boolean") {
    data.isArchived = body.isArchived;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.resume.update({
    where: { id },
    data,
    select: { id: true, name: true, isArchived: true, lastEditedAt: true },
  });
  return NextResponse.json({ ok: true, resume: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const owned = await loadOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  // Soft-archive — comments, revisions, and the derivation chain
  // stay intact. Recoverable from /profile/resumes by unarchiving.
  await prisma.resume.update({
    where: { id },
    data: { isArchived: true },
  });
  return NextResponse.json({ ok: true });
}
