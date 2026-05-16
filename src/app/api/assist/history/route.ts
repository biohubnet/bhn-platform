/**
 * GET    /api/assist/history  — read the calling user's full
 *                               assist trail: recent events,
 *                               rollups, weekly summaries, hints
 *                               + feedback.
 * DELETE /api/assist/history  — wipe everything except prefs.
 *
 * The audit/wipe page at /profile/assist-history is the user-
 * facing trust artifact for the longer (90-day raw / 12-mo
 * rollup / 18-mo summary) retention window. Deleting everything
 * here is a single transaction; cascades on the unique
 * (userId) → child relations do the work.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    eventCount,
    recentEvents,
    rollupCount,
    rollups,
    summaries,
    hints,
  ] = await Promise.all([
    prisma.assistEvent.count({ where: { userId } }),
    prisma.assistEvent.findMany({
      where: { userId },
      orderBy: { ts: "desc" },
      take: 50,
      select: { id: true, ts: true, kind: true, surface: true, target: true },
    }),
    prisma.assistDailyRollup.count({ where: { userId } }),
    prisma.assistDailyRollup.findMany({
      where: { userId },
      orderBy: { day: "desc" },
      take: 30,
      select: {
        day: true, surface: true, views: true, clicks: true,
        rageClicks: true, deadClicks: true, formAbandons: true,
        errors: true, dwellMs: true, completed: true,
      },
    }),
    prisma.assistWeeklySummary.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 12,
      select: { weekStart: true, summary: true, stuckOn: true },
    }),
    prisma.assistHint.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, helpKey: true, title: true, body: true,
        surface: true, triggeredBy: true, confidence: true,
        status: true, createdAt: true, shownAt: true, resolvedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    counts: {
      events: eventCount,
      rollups: rollupCount,
      summaries: summaries.length,
      hints: hints.length,
    },
    recentEvents,
    rollups,
    summaries,
    hints,
  });
}

export async function DELETE() {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Wipe everything except prefs. Hints' feedback cascades with the
  // hint row.
  const [events, rollups, summaries, hints] = await Promise.all([
    prisma.assistEvent.deleteMany({ where: { userId } }),
    prisma.assistDailyRollup.deleteMany({ where: { userId } }),
    prisma.assistWeeklySummary.deleteMany({ where: { userId } }),
    prisma.assistHint.deleteMany({ where: { userId } }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      events: events.count,
      rollups: rollups.count,
      summaries: summaries.count,
      hints: hints.count,
    },
  });
}
