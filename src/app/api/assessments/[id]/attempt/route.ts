import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { answers } = await req.json() as { answers: Record<string, string> };

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: true },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Grade
  let earned = 0;
  let maxScore = 0;
  for (const q of assessment.questions) {
    maxScore += q.points;
    if (answers[q.id] !== undefined && answers[q.id] === q.correctAnswer) {
      earned += q.points;
    }
  }

  const score = maxScore > 0 ? (earned / maxScore) * 100 : 0;
  const passed = score >= assessment.passingScore;

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      userId,
      score,
      maxScore,
      passed,
      answers: JSON.stringify(answers),
      submittedAt: new Date(),
    },
  });

  // Update enrollment progress if all assessments passed
  await prisma.enrollment.updateMany({
    where: { userId, courseId: assessment.courseId },
    data: {
      score,
      ...(passed ? { status: "completed", completedAt: new Date() } : {}),
    },
  });

  // Issue certificate on pass
  if (passed) {
    await prisma.certificate.upsert({
      where: { userId_courseId: { userId, courseId: assessment.courseId } },
      update: { issueDate: new Date(), metadata: JSON.stringify({ score, passed }) },
      create: {
        userId,
        courseId: assessment.courseId,
        metadata: JSON.stringify({ score, passed }),
      },
    });
  }

  return NextResponse.json({ ...attempt, score, passed, maxScore });
}
