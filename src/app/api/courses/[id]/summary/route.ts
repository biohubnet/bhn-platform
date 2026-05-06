import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

/**
 * Generate or refresh the AI summary for a course. Staff only.
 * The summary is stored on Course.aiSummary and shown to all learners.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id;
  if (!AI_CONFIGURED.chat) return NextResponse.json({ error: "AI not configured." }, { status: 500 });

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: { select: { title: true, description: true }, orderBy: { order: "asc" }, take: 50 },
      assessments: { select: { title: true, passingScore: true }, take: 10 },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const modulesText = course.modules.map((m, i) =>
    `${i + 1}. ${m.title}${m.description ? " — " + m.description : ""}`
  ).join("\n");
  const assessText = course.assessments.length
    ? `\nAssessments: ${course.assessments.map((a) => a.title).join(", ")}.`
    : "";

  const result = await chat([
    {
      role: "system",
      content:
        "You write concise, learner-friendly summaries of training courses for a biomanufacturing LMS. " +
        "Plain prose, no headings, no bullet points, no marketing language. 3 paragraphs maximum, " +
        "around 150 words total. First paragraph: what the course covers and who it's for. " +
        "Second: key topics and skills. Third: how it's assessed and what the learner will be able to do after. " +
        "If the source is sparse, write less rather than padding.",
    },
    {
      role: "user",
      content:
        `Course title: ${course.title}\n` +
        (course.category ? `Category: ${course.category}\n` : "") +
        `Description: ${course.description ?? "(none provided)"}\n\n` +
        (modulesText ? `Modules:\n${modulesText}\n` : "") +
        assessText +
        `\nDuration: ${course.duration ?? "unspecified"} minutes. ` +
        `Passing score: ${course.passingScore}%.\n\n` +
        `Write the summary now.`,
    },
  ], { feature: "course_summary", userId, maxTokens: 400, temperature: 0.4 });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  const updated = await prisma.course.update({
    where: { id },
    data: { aiSummary: result.text.trim() },
    select: { aiSummary: true },
  });
  return NextResponse.json({ aiSummary: updated.aiSummary });
}
