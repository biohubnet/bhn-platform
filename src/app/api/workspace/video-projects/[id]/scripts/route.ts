/**
 * Scripts under a video project (admin-only).
 *   POST /api/workspace/video-projects/[id]/scripts → create { title? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const { id: projectId } = await ctx.params;
  const project = await prisma.videoProject.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = (body.title ?? "Untitled script").trim().slice(0, 160) || "Untitled script";
  const count = await prisma.script.count({ where: { projectId } });
  const script = await prisma.script.create({
    data: {
      projectId,
      title,
      order: count,
      createdById: uid,
      sections: { create: [{ order: 0, heading: "", body: "" }] },
    },
  });
  return NextResponse.json({ ok: true, script: { id: script.id, title: script.title } }, { status: 201 });
}
