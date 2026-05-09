/**
 * Bookmark CRUD-lite for the calling trainee.
 *
 *   GET    /api/adaptive/bookmarks?due=1   — list (default: all)
 *   POST   /api/adaptive/bookmarks { questionId } — toggle on
 *   DELETE /api/adaptive/bookmarks?questionId=... — toggle off
 *
 * Initial schedule for a new bookmark: tomorrow (first ladder rung).
 * `due=1` flag filters to bookmarks where nextReviewAt <= now, used
 * by the dashboard "Today's Reviews" card.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initialNextReviewAt } from "@/lib/adaptive/review-schedule";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const dueOnly = req.nextUrl.searchParams.get("due") === "1";
  const where: Record<string, unknown> = { userId };
  if (dueOnly) where.nextReviewAt = { lte: new Date() };

  const rows = await prisma.reviewBookmark.findMany({
    where,
    include: {
      question: {
        select: {
          id: true, text: true, type: true, options: true,
          correctAnswer: true, explanation: true, topic: true,
          assessment: { select: { id: true, title: true, courseId: true } },
        },
      },
    },
    orderBy: { nextReviewAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ bookmarks: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = (await req.json().catch(() => ({}))) as { questionId?: string };
  if (!body.questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  // Confirm the question exists. Idempotent on (userId, questionId).
  const q = await prisma.question.findUnique({
    where: { id: body.questionId }, select: { id: true },
  });
  if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const row = await prisma.reviewBookmark.upsert({
    where: { userId_questionId: { userId, questionId: q.id } },
    create: {
      userId,
      questionId: q.id,
      intervalDays: 1,
      nextReviewAt: initialNextReviewAt(),
    },
    update: {}, // already bookmarked — no-op
  });

  return NextResponse.json({ ok: true, bookmark: row });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const questionId = req.nextUrl.searchParams.get("questionId")?.trim();
  if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });

  await prisma.reviewBookmark
    .delete({ where: { userId_questionId: { userId, questionId } } })
    .catch(() => null); // idempotent

  return NextResponse.json({ ok: true });
}
