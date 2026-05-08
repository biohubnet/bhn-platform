/**
 * Trainee endpoints for managing their own UserSkill profile.
 *
 *   GET    /api/profile/skills        → my skills + suggested
 *   POST   /api/profile/skills        → self-claim a skill {skillId, level?}
 *   PATCH  /api/profile/skills        → update level / source on existing
 *   DELETE /api/profile/skills?id=    → remove a UserSkill row
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({
    where: { email: session.user.email }, select: { id: true },
  });
  return u?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const mine = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { id: true, name: true, category: true, status: true } } },
    orderBy: [{ level: "desc" }],
  });
  return NextResponse.json({
    skills: mine
      .filter((u) => u.skill.status !== "merged")
      .map((u) => ({
        id: u.id,
        skillId: u.skillId,
        name: u.skill.name,
        category: u.skill.category,
        level: u.level,
        source: u.source,
        evidence: u.evidence,
      })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { skillId?: string; level?: number };
  if (!body.skillId) return NextResponse.json({ error: "skillId required" }, { status: 400 });
  const level = clamp01(body.level ?? 0.5);
  const skill = await prisma.userSkill.upsert({
    where: { userId_skillId: { userId, skillId: body.skillId } },
    create: { userId, skillId: body.skillId, level, source: "self" },
    update: { level, source: "self" },
  });
  return NextResponse.json({ ok: true, skill });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; level?: number };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const level = body.level !== undefined ? clamp01(body.level) : undefined;
  const skill = await prisma.userSkill.update({
    where: { id: body.id },
    data: {
      ...(level !== undefined ? { level, source: "self" } : {}),
    },
  });
  return NextResponse.json({ ok: true, skill });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Make sure the row belongs to this user.
  const row = await prisma.userSkill.findUnique({ where: { id } });
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.userSkill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
