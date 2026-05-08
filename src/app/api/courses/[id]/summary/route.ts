/**
 * Course AI summary endpoint.
 *
 *   POST   { } or { refinePrompt: string }
 *     - No body: regenerate from scratch using the course's modules
 *       and assessments as source.
 *     - With refinePrompt: take the existing aiSummary and rewrite
 *       it to match the user's instruction (e.g. "make it shorter",
 *       "more technical", "drop the third paragraph").
 *
 *   PATCH  { aiSummary: string }
 *     - Save a manually-edited summary verbatim. No AI call.
 *
 * Both write to Course.aiSummary. Staff (instructor / admin) only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

const BASE_SYSTEM =
  "You write concise, learner-friendly summaries of training courses for a biomanufacturing LMS. " +
  "Plain prose, no headings, no bullet points, no marketing language. 3 paragraphs maximum, " +
  "around 150 words total. First paragraph: what the course covers and who it's for. " +
  "Second: key topics and skills. Third: how it's assessed and what the learner will be able to do after. " +
  "If the source is sparse, write less rather than padding.";

const REFINE_SYSTEM =
  "You're refining an existing AI-generated course summary based on a user's instruction. " +
  "Rewrite the summary applying the instruction strictly. Keep the same plain-prose, no-headings, " +
  "no-marketing format unless the instruction explicitly says otherwise. Stay around 150 words " +
  "total unless instructed to lengthen or shorten. Reply with ONLY the rewritten summary, no preamble.";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id;
  if (!AI_CONFIGURED.chat) return NextResponse.json({ error: "AI not configured." }, { status: 500 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { refinePrompt?: string };
  const refinePrompt = body.refinePrompt?.trim();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: { select: { title: true, description: true }, orderBy: { order: "asc" }, take: 50 },
      assessments: { select: { title: true, passingScore: true }, take: 10 },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Refine path — use existing summary + the instruction as input.
  if (refinePrompt) {
    if (!course.aiSummary) {
      return NextResponse.json({ error: "Generate an initial summary first, then refine." }, { status: 400 });
    }
    const result = await chat([
      { role: "system", content: REFINE_SYSTEM },
      {
        role: "user",
        content:
          `Course title: ${course.title}\n` +
          (course.category ? `Category: ${course.category}\n` : "") +
          `\nCurrent summary:\n${course.aiSummary}\n\n` +
          `Refinement instruction:\n${refinePrompt}\n\n` +
          `Write the refined summary now.`,
      },
    ], { feature: "course_summary_refine", userId, maxTokens: 400, temperature: 0.4 });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
    const updated = await prisma.course.update({
      where: { id },
      data: { aiSummary: result.text.trim() },
      select: { aiSummary: true },
    });
    return NextResponse.json({ aiSummary: updated.aiSummary });
  }

  // Fresh-generate path — original behaviour, unchanged.
  const modulesText = course.modules.map((m, i) =>
    `${i + 1}. ${m.title}${m.description ? " — " + m.description : ""}`
  ).join("\n");
  const assessText = course.assessments.length
    ? `\nAssessments: ${course.assessments.map((a) => a.title).join(", ")}.`
    : "";

  const result = await chat([
    { role: "system", content: BASE_SYSTEM },
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

/** Manual save — admin types or hand-edits the summary directly. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { aiSummary?: string };
  const next = typeof body.aiSummary === "string" ? body.aiSummary.trim() : "";
  if (!next) {
    return NextResponse.json({ error: "aiSummary cannot be empty." }, { status: 400 });
  }
  const updated = await prisma.course.update({
    where: { id },
    data: { aiSummary: next },
    select: { aiSummary: true },
  });
  return NextResponse.json({ aiSummary: updated.aiSummary });
}
