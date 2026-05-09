/**
 * POST /api/modules/[id]/checkpoints/answer
 *   { checkpointId, answer }
 *
 * Evaluates a trainee's answer to a checkpoint question without
 * leaking the correct answer to the client. Returns:
 *   { correct: boolean, explanation: string | null }
 *
 * No persistence of the attempt yet — the cheap MVP doesn't track
 * checkpoint answers in the gradebook. Promote to AssessmentAttempt-
 * style logging once we have feedback that authors want it.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id: moduleId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    checkpointId?: string;
    answer?: string;
  };
  if (!body.checkpointId || typeof body.answer !== "string") {
    return NextResponse.json({ error: "checkpointId and answer are required" }, { status: 400 });
  }

  const checkpoint = await prisma.moduleCheckpoint.findUnique({
    where: { id: body.checkpointId },
    include: { question: { select: { correctAnswer: true, explanation: true } } },
  });
  if (!checkpoint || checkpoint.moduleId !== moduleId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!checkpoint.question || checkpoint.question.correctAnswer == null) {
    // Pause-only checkpoint (no question linked) — every "answer" is
    // implicitly fine; the player would have skipped this branch.
    return NextResponse.json({ correct: true, explanation: null });
  }

  const correct = body.answer === checkpoint.question.correctAnswer;
  return NextResponse.json({
    correct,
    explanation: correct ? null : checkpoint.question.explanation,
  });
}
