/**
 * Human-in-the-loop feedback on an AI answer.
 *   POST /api/ai/feedback  { interactionId, rating: 1 | -1, answerExcerpt? }
 * Records the thumbs rating on the AIInteraction telemetry row (powers the
 * answer-acceptance rate). A thumbs-down opens a review-queue entry.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { interactionId?: unknown; rating?: unknown; answerExcerpt?: unknown };
  const interactionId = typeof body.interactionId === "string" ? body.interactionId : "";
  const rating = body.rating === 1 || body.rating === -1 ? body.rating : null;
  if (!interactionId || rating === null) return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });

  const row = await prisma.aIInteraction.findUnique({
    where: { id: interactionId },
    select: { id: true, reviewStatus: true, answerExcerpt: true },
  });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const excerpt = typeof body.answerExcerpt === "string" ? body.answerExcerpt.slice(0, 2000) : null;
  await prisma.aIInteraction.update({
    where: { id: interactionId },
    data: {
      userRating: rating,
      // Thumbs-down opens a review (unless one already exists for this row).
      ...(rating < 0
        ? { flaggedForReview: true, reviewStatus: row.reviewStatus ?? "open", answerExcerpt: row.answerExcerpt ?? excerpt }
        : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
