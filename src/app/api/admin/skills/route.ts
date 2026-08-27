/**
 * Admin endpoints for the skill ontology.
 *
 *   GET    /api/admin/skills              → all skills + counts
 *   POST   /api/admin/skills              → create a new skill
 *   PATCH  /api/admin/skills              → update name/category/status
 *   POST   /api/admin/skills/merge        → merge two skills (separate route)
 */
import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";
import {
  ensureSkillSeed, slugify, embedSkill, embedMissingSkills,
} from "@/lib/skills/ontology";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  // Idempotent — first hit seeds the starter catalog, subsequent hits no-op.
  await ensureSkillSeed();
  // Best-effort embed a small batch each visit so the index warms up
  // without blocking the page on a giant batch.
  embedMissingSkills(10).catch(() => undefined);

  const skills = await prisma.skill.findMany({
    orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, category: true, description: true,
      status: true, mergedIntoId: true, createdAt: true,
      _count: { select: { aliases: true, courses: true, users: true, postings: true } },
    },
  });
  return NextResponse.json({ skills });
}

export async function POST(req: NextRequest) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const body = (await req.json().catch(() => ({}))) as { name?: string; category?: string; description?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const slug = slugify(name);
  if (!slug) return NextResponse.json({ error: "name produced empty slug" }, { status: 400 });
  try {
    const skill = await prisma.skill.create({
      data: {
        name,
        slug,
        category: body.category?.trim() || null,
        description: body.description?.trim() || null,
        status: "active",
      },
    });
    await prisma.skillAlias.create({
      data: { skillId: skill.id, alias: name.toLowerCase() },
    }).catch(() => undefined);
    embedSkill(skill.id).catch(() => undefined);
    return NextResponse.json({ ok: true, skill });
  } catch {
    return NextResponse.json({ error: "name or slug already exists" }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    status?: string;
    addAlias?: string;
    removeAliasId?: string;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined)        data.name = body.name.trim();
  if (body.category !== undefined)    data.category = body.category?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.status !== undefined &&
      ["active", "deprecated", "review"].includes(body.status)) {
    data.status = body.status;
  }

  if (Object.keys(data).length > 0) {
    await prisma.skill.update({ where: { id: body.id }, data });
    embedSkill(body.id).catch(() => undefined);
  }

  if (body.addAlias) {
    const alias = body.addAlias.trim().toLowerCase();
    if (alias) {
      try {
        await prisma.skillAlias.create({ data: { skillId: body.id, alias } });
      } catch {
        return NextResponse.json({ error: "alias already exists somewhere" }, { status: 409 });
      }
    }
  }
  if (body.removeAliasId) {
    await prisma.skillAlias.delete({ where: { id: body.removeAliasId } }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const _guard = await guardRole("superadmin");
  if (_guard instanceof NextResponse) return _guard;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Cascade handles tags / aliases / merges via FK ON DELETE CASCADE.
  await prisma.skill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
