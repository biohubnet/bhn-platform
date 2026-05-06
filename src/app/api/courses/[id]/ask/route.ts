import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

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
  const context =
    `Course: ${course.title}\n` +
    (course.category ? `Category: ${course.category}\n` : "") +
    (course.description ? `\nDescription:\n${course.description}\n` : "") +
    (course.aiSummary ? `\nSummary:\n${course.aiSummary}\n` : "") +
    (moduleList ? `\nModules in this course:\n${moduleList}\n` : "");

  const result = await chat([
    {
      role: "system",
      content:
        "You are a study assistant for a biomanufacturing training platform. Help the learner understand " +
        "the SPECIFIC course context provided. Stay focused on that course; if the question is unrelated, " +
        "politely redirect to the course content. Be concise (2-4 short paragraphs max), use plain language, " +
        "and never invent specifics that aren't supported by the context. If the answer isn't in the context, " +
        "say what general principle applies and suggest which module is most relevant.",
    },
    { role: "user", content: `${context}\n\nLearner's question: ${q}` },
  ], { feature: "course_tutor", userId, maxTokens: 500, temperature: 0.4 });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ answer: result.text.trim() });
}
