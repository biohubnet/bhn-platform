/**
 * POST /api/adaptive/bookmarks/[id]/review  { quality: "got_it" | "still_tricky" }
 *
 * Apply a self-grade to a bookmark and reschedule. Pure-function
 * scheduler in lib/adaptive/review-schedule; this handler is just
 * the I/O wrapper + ownership check.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextReview, type ReviewQuality } from "@/lib/adaptive/review-schedule";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { quality?: ReviewQuality };
  if (body.quality !== "got_it" && body.quality !== "still_tricky") {
    return NextResponse.json({ error: "quality must be 'got_it' or 'still_tricky'" }, { status: 400 });
  }

  const row = await prisma.reviewBookmark.findUnique({ where: { id } });
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { nextIntervalDays, nextReviewAt } = nextReview({
    intervalDays: row.intervalDays,
    quality: body.quality,
  });

  const updated = await prisma.reviewBookmark.update({
    where: { id },
    data: {
      intervalDays: nextIntervalDays,
      nextReviewAt,
      lastReviewedAt: new Date(),
      lastQuality: body.quality === "got_it" ? 1 : 0,
    },
  });
  return NextResponse.json({ ok: true, bookmark: updated });
}
