import { NextRequest, NextResponse } from "next/server";
import { requireCourseOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  // Lock to course owner (or admin moderator). Without this, any
  // instructor could create/inject assessments on any course.
  try {
    await requireCourseOwner(courseId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();

  const assessment = await prisma.assessment.create({
    data: {
      courseId,
      title: data.title,
      description: data.description,
      timeLimit: data.timeLimit,
      passingScore: data.passingScore ?? 75,
      maxAttempts: data.maxAttempts ?? 0,
      shuffleQ: data.shuffleQ ?? false,
      questions: {
        create: (data.questions ?? []).map(
          (q: { text: string; type: string; options?: string[]; correctAnswer: string; points?: number; order: number; explanation?: string }) => ({
            text: q.text,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            points: q.points ?? 1,
            order: q.order,
            explanation: q.explanation,
          })
        ),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
