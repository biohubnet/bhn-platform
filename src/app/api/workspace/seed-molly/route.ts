/**
 * One-click seed (admin-only): creates the "BHN Promo Video Project" and its
 * "Molly Interview Conversation Guide" script from the baked-in MOLLY_SECTIONS.
 * Idempotent — reuses an existing project/script if already present.
 *   POST /api/workspace/seed-molly
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOLLY_SECTIONS, MOLLY_SCRIPT_TITLE } from "@/lib/scripts/molly-seed";

export const runtime = "nodejs";

const PROJECT_TITLE = "BHN Promo Video Project";

export async function POST() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;

  let project = await prisma.videoProject.findFirst({ where: { title: PROJECT_TITLE } });
  if (!project) {
    project = await prisma.videoProject.create({
      data: {
        title: PROJECT_TITLE,
        summary: "Promo / introductory video for BHN's target audiences.",
        category: "marketing",
        createdById: uid,
      },
    });
  }

  const existing = await prisma.script.findFirst({
    where: { projectId: project.id, title: MOLLY_SCRIPT_TITLE },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, projectId: project.id, scriptId: existing.id, seeded: false });
  }

  const script = await prisma.script.create({
    data: {
      projectId: project.id,
      title: MOLLY_SCRIPT_TITLE,
      format: "sections",
      createdById: uid,
      sections: { create: MOLLY_SECTIONS.map((s, i) => ({ order: i, heading: s.heading, body: s.body })) },
    },
  });
  return NextResponse.json({ ok: true, projectId: project.id, scriptId: script.id, seeded: true });
}
