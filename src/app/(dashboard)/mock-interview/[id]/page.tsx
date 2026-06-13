/**
 * Mock Interview runner page. Loads the session + its questions and hands off
 * to the client runner (read-aloud, voice/typed answers, per-question scoring,
 * final debrief). Owner-only.
 */
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InterviewRunner, type RunnerAnswer } from "@/components/interview/InterviewRunner";

export const dynamic = "force-dynamic";

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

interface Props { params: Promise<{ id: string }> }

export default async function MockInterviewRunnerPage({ params }: Props) {
  const session = await getSession();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const { id } = await params;

  const interview = await prisma.mockInterview.findFirst({
    where: { id, userId: uid },
    select: {
      id: true, role: true, status: true, overallScore: true, summary: true,
      answers: {
        orderBy: { order: "asc" },
        select: {
          id: true, order: true, question: true, questionKind: true,
          transcript: true, inputMode: true, score: true, feedback: true,
          strengths: true, improvements: true, answeredAt: true,
        },
      },
    },
  });
  if (!interview) notFound();

  const answers: RunnerAnswer[] = interview.answers.map((a) => ({
    id: a.id,
    order: a.order,
    question: a.question,
    questionKind: a.questionKind,
    transcript: a.transcript,
    inputMode: a.inputMode,
    score: a.score,
    feedback: a.feedback,
    strengths: asList(a.strengths),
    improvements: asList(a.improvements),
    answered: a.answeredAt !== null,
  }));

  return (
    <InterviewRunner
      interview={{
        id: interview.id,
        role: interview.role,
        status: interview.status,
        overallScore: interview.overallScore,
        summary: interview.summary,
      }}
      answers={answers}
    />
  );
}
