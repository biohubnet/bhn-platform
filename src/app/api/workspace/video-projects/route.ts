/**
 * Workspace → Video Production projects (admin-only).
 *   GET  /api/workspace/video-projects        → list (active by default; ?archived=1)
 *   POST /api/workspace/video-projects        → create { title, summary? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const includeArchived = new URL(req.url).searchParams.get("archived") === "1";
  const projects = await prisma.videoProject.findMany({
    where: { category: "marketing", ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { scripts: true } } },
  });
  return NextResponse.json({
    ok: true,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      status: p.status,
      isArchived: p.isArchived,
      scriptCount: p._count.scripts,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const body = (await req.json().catch(() => ({}))) as { title?: string; summary?: string };
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "A project title is required." }, { status: 400 });
  const project = await prisma.videoProject.create({
    data: {
      title: title.slice(0, 160),
      summary: (body.summary ?? "").slice(0, 600),
      category: "marketing",
      createdById: uid,
    },
  });
  return NextResponse.json({ ok: true, project: { id: project.id, title: project.title } }, { status: 201 });
}
