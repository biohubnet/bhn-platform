/**
 * STAR-story single-row — update + delete.
 *
 *   PATCH /api/prep/star/[id]
 *     body: partial of the create body. Only the row owner can edit.
 *
 *   DELETE /api/prep/star/[id]
 *     Hard-deletes. Story Bank is user-private; no audit value.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_TITLE = 120;
const MAX_FIELD = 2000;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.starStory.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    tags?: string[];
    skillIds?: string[];
  };

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim().slice(0, MAX_TITLE);
  if (typeof body.situation === "string") data.situation = body.situation.trim().slice(0, MAX_FIELD);
  if (typeof body.task === "string") data.task = body.task.trim().slice(0, MAX_FIELD);
  if (typeof body.action === "string") data.action = body.action.trim().slice(0, MAX_FIELD);
  if (typeof body.result === "string") data.result = body.result.trim().slice(0, MAX_FIELD);
  if (Array.isArray(body.tags)) {
    data.tags = body.tags
      .filter((t) => typeof t === "string")
      .map((t) => t.slice(0, 40))
      .slice(0, 8);
  }

  // If skillIds present, replace the link rows atomically.
  if (Array.isArray(body.skillIds)) {
    const skillIds = body.skillIds.filter((s) => typeof s === "string").slice(0, 10);
    await prisma.$transaction([
      prisma.starStorySkill.deleteMany({ where: { storyId: id } }),
      ...(skillIds.length > 0
        ? [prisma.starStorySkill.createMany({ data: skillIds.map((sid) => ({ storyId: id, skillId: sid })) })]
        : []),
    ]);
  }

  await prisma.starStory.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.starStory.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await prisma.starStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
