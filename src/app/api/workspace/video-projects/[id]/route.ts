/**
 * One video project (admin-only).
 *   GET    /api/workspace/video-projects/[id]   → detail + its scripts
 *   PATCH  /api/workspace/video-projects/[id]   → { title?, summary?, status? }
 *   DELETE /api/workspace/video-projects/[id]   → soft-archive; ?force=true hard delete
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const project = await prisma.videoProject.findUnique({
    where: { id },
    include: {
      scripts: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        select: { id: true, title: true, format: true, order: true, updatedAt: true, _count: { select: { sections: true } } },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    project: {
      id: project.id,
      title: project.title,
      summary: project.summary,
      status: project.status,
      scripts: project.scripts.map((s) => ({
        id: s.id, title: s.title, format: s.format, order: s.order,
        sectionCount: s._count.sections, updatedAt: s.updatedAt,
      })),
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { title?: string; summary?: string; status?: string };
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
  if (typeof body.summary === "string") data.summary = body.summary.slice(0, 600);
  if (typeof body.status === "string") data.status = body.status.slice(0, 40);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No changes." }, { status: 400 });
  const project = await prisma.videoProject.update({ where: { id }, data }).catch(() => null);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, project: { id: project.id, title: project.title, summary: project.summary, status: project.status } });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const force = new URL(req.url).searchParams.get("force") === "true";
  if (force) {
    await prisma.videoProject.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true, deleted: true });
  }
  await prisma.videoProject.update({ where: { id }, data: { isArchived: true } }).catch(() => null);
  return NextResponse.json({ ok: true, archived: true });
}
