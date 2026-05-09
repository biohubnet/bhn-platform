/**
 * Author CRUD for video-module checkpoints. Author flow:
 *   1. GET — list current checkpoints for a module (course-detail editor).
 *   2. POST — add a checkpoint at a timestamp, optionally linking a question.
 *   3. PATCH — update an existing checkpoint (timestamp / question).
 *   4. DELETE — remove a checkpoint.
 *
 * Authorization: course owner (instructor) or admin/superadmin via
 * the existing requireCourseOwner helper. We resolve the courseId
 * from the module first so callers don't have to pass it.
 *
 * Trainee-facing read lives at GET /api/modules/[id]/checkpoints
 * (separate route below) and never includes correctAnswer.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCourseOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function authoriseModule(moduleId: string) {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true },
  });
  if (!mod) return null;
  try {
    await requireCourseOwner(mod.courseId);
    return mod;
  } catch {
    return null;
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await authoriseModule(id);
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.moduleCheckpoint.findMany({
    where: { moduleId: id },
    include: {
      question: { select: { id: true, text: true, topic: true, assessment: { select: { title: true } } } },
    },
    orderBy: [{ orderIndex: "asc" }, { timestampSeconds: "asc" }],
  });
  return NextResponse.json({ checkpoints: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await authoriseModule(id);
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    timestampSeconds?: number;
    questionId?: string | null;
  };
  if (typeof body.timestampSeconds !== "number" || body.timestampSeconds < 0) {
    return NextResponse.json({ error: "timestampSeconds must be a non-negative number" }, { status: 400 });
  }

  // Auto-set orderIndex from current count so checkpoints render in
  // creation order; authors can resequence with PATCH later.
  const count = await prisma.moduleCheckpoint.count({ where: { moduleId: id } });
  const created = await prisma.moduleCheckpoint.create({
    data: {
      moduleId: id,
      timestampSeconds: body.timestampSeconds,
      questionId: body.questionId ?? null,
      orderIndex: count,
    },
  });
  return NextResponse.json({ ok: true, checkpoint: created }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await authoriseModule(id);
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    checkpointId?: string;
    timestampSeconds?: number;
    questionId?: string | null;
    orderIndex?: number;
  };
  if (!body.checkpointId) return NextResponse.json({ error: "checkpointId required" }, { status: 400 });

  // Confirm the checkpoint belongs to the authorised module before mutating.
  const existing = await prisma.moduleCheckpoint.findUnique({ where: { id: body.checkpointId } });
  if (!existing || existing.moduleId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.timestampSeconds === "number") data.timestampSeconds = body.timestampSeconds;
  if (body.questionId !== undefined) data.questionId = body.questionId;
  if (typeof body.orderIndex === "number") data.orderIndex = body.orderIndex;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const updated = await prisma.moduleCheckpoint.update({
    where: { id: body.checkpointId },
    data,
  });
  return NextResponse.json({ ok: true, checkpoint: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await authoriseModule(id);
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const checkpointId = req.nextUrl.searchParams.get("checkpointId")?.trim();
  if (!checkpointId) return NextResponse.json({ error: "checkpointId is required" }, { status: 400 });

  const existing = await prisma.moduleCheckpoint.findUnique({ where: { id: checkpointId } });
  if (!existing || existing.moduleId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.moduleCheckpoint.delete({ where: { id: checkpointId } });
  return NextResponse.json({ ok: true });
}
