/**
 * POST /api/simulator/[attemptId]/rewind   body: { week: number }
 *
 * Rewinds an attempt to the START of `week`, keeping the trainee's
 * earlier decisions and discarding everything from that week onward, so
 * they can replay from there without resetting the whole quarter. Uses
 * the same pure engine (rewindToWeek) the guest player runs client-side.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rewindToWeek } from "@/lib/simulator/engine";
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  SimulationPayload,
} from "@/lib/simulator/types";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { attemptId } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { week?: unknown };
  const week = typeof body.week === "number" ? Math.trunc(body.week) : 0;
  if (week < 1 || week > 12) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { simulation: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = attempt.simulation.payload as unknown as SimulationPayload;
  const state: AttemptState = {
    week: attempt.week,
    scenarioIndex: attempt.scenarioIndex,
    stats: attempt.stats as unknown as AttemptStats,
    log: attempt.log as unknown as LogEntry[],
    finished: attempt.finished,
  };

  const next = rewindToWeek(payload, state, week);

  const updated = await prisma.simulationAttempt.update({
    where: { id: attemptId },
    data: {
      week: next.week,
      scenarioIndex: next.scenarioIndex,
      stats: next.stats as unknown as object,
      log: next.log as unknown as object,
      finished: false,
      finishedAt: null,
      finalScore: null,
      finalTier: null,
    },
  });

  return NextResponse.json({
    ok: true,
    week: updated.week,
    scenarioIndex: updated.scenarioIndex,
    stats: updated.stats,
  });
}
