import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { AI_CONFIGURED } from "@/lib/ai";
import { callText, delimitContext, groundednessConfidence } from "@/lib/ai/reliability";
import { COURSE_TUTOR } from "@/lib/ai/prompts";

/**
 * Course-grounded Q&A. We feed the LLM the course title, description,
 * AI summary, module list, and the user's question. We refuse to answer
 * outside the course's scope.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!AI_CONFIGURED.chat) return NextResponse.json({ error: "AI not configured." }, { status: 500 });

  const { id } = await params;
  const { question } = await req.json();
  const q = (question as string | undefined)?.trim();
  if (!q || q.length < 2) return NextResponse.json({ error: "Empty question." }, { status: 400 });
  if (q.length > 500) return NextResponse.json({ error: "Question too long (500 char max)." }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id },
    include: { modules: { select: { title: true, description: true }, orderBy: { order: "asc" }, take: 30 } },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const moduleList = course.modules.map((m) => `- ${m.title}${m.description ? ": " + m.description : ""}`).join("\n");
  // Untrusted retrieved content is sanitized + delimited (prompt-injection
  // defense); the system prompt declares <course_context> data-only.
  const context = delimitContext(
    "course_context",
    `Course: ${course.title}\n` +
      (course.category ? `Category: ${course.category}\n` : "") +
      (course.description ? `\nDescription:\n${course.description}\n` : "") +
      (course.aiSummary ? `\nSummary:\n${course.aiSummary}\n` : "") +
      (moduleList ? `\nModules in this course:\n${moduleList}\n` : ""),
  );

  const result = await callText(
    [
      { role: "system", content: COURSE_TUTOR.system },
      { role: "user", content: `${context}\n\nLearner's question: ${q}` },
    ],
    { feature: "course_tutor", userId, maxTokens: 500, temperature: 0.4, promptVersion: COURSE_TUTOR.version },
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  const answer = result.text.trim();

  // Confidence = how grounded the answer is in the course context. Below the
  // threshold we flag it for human review and tell the learner.
  const confidence = groundednessConfidence(answer, context);
  const flagged = confidence < 0.35;
  if (result.interactionId) {
    await prisma.aIInteraction
      .update({
        where: { id: result.interactionId },
        data: {
          confidence,
          ...(flagged ? { flaggedForReview: true, reviewStatus: "open", answerExcerpt: answer.slice(0, 2000) } : {}),
        },
      })
      .catch(() => {});
  }
  return NextResponse.json({ answer, interactionId: result.interactionId, confidence, flagged });
}
