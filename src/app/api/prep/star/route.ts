/**
 * STAR-story bank — list + create.
 *
 *   GET  /api/prep/star
 *     Returns every StarStory authored by the signed-in user, newest
 *     first. Used by the Story Bank page at /profile/stories and by
 *     the prep flow's Step 4 "you already have a story for this skill"
 *     suggestion.
 *
 *   POST /api/prep/star
 *     body: {
 *       title: string, situation: string, task: string,
 *       action: string, result: string,
 *       skillIds?: string[], tags?: string[], sourcePostingId?: string,
 *     }
 *     Creates a new StarStory. All four STAR fields required.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_TITLE = 120;
const MAX_FIELD = 2000;

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stories = await prisma.starStory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      skills: { include: { skill: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    ok: true,
    stories: stories.map((s) => ({
      id: s.id,
      title: s.title,
      situation: s.situation,
      task: s.task,
      action: s.action,
      result: s.result,
      tags: s.tags,
      skills: s.skills.map((ss) => ({ id: ss.skill.id, name: ss.skill.name })),
      sourcePostingId: s.sourcePostingId,
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    skillIds?: string[];
    tags?: string[];
    sourcePostingId?: string;
  };

  const title = String(body.title ?? "").trim().slice(0, MAX_TITLE);
  const situation = String(body.situation ?? "").trim().slice(0, MAX_FIELD);
  const task = String(body.task ?? "").trim().slice(0, MAX_FIELD);
  const action = String(body.action ?? "").trim().slice(0, MAX_FIELD);
  const result = String(body.result ?? "").trim().slice(0, MAX_FIELD);

  if (!title || !situation || !task || !action || !result) {
    return NextResponse.json(
      { error: "title + all four STAR fields are required." },
      { status: 400 },
    );
  }

  const skillIds = Array.isArray(body.skillIds)
    ? body.skillIds.filter((s) => typeof s === "string").slice(0, 10)
    : [];
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string").map((t) => t.slice(0, 40)).slice(0, 8)
    : [];

  const story = await prisma.starStory.create({
    data: {
      userId,
      title,
      situation,
      task,
      action,
      result,
      tags,
      sourcePostingId: body.sourcePostingId ?? null,
      skills: skillIds.length > 0
        ? { create: skillIds.map((skillId) => ({ skillId })) }
        : undefined,
    },
    include: {
      skills: { include: { skill: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    ok: true,
    story: {
      id: story.id,
      title: story.title,
      situation: story.situation,
      task: story.task,
      action: story.action,
      result: story.result,
      tags: story.tags,
      skills: story.skills.map((ss) => ({ id: ss.skill.id, name: ss.skill.name })),
      sourcePostingId: story.sourcePostingId,
      updatedAt: story.updatedAt.toISOString(),
    },
  });
}
