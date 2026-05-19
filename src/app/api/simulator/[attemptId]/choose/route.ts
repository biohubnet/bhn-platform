/**
 * POST /api/simulator/[attemptId]/choose
 *
 * Body: { choiceIndex: number }
 *
 * Applies the chosen option to the current scenario, advances the
 * attempt state, and persists. On the final choice of the final
 * scenario the attempt is marked finished and the final score + tier
 * are computed.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyChoice, computeReview } from "@/lib/simulator/engine";
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  SimulationPayload,
} from "@/lib/simulator/types";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { attemptId } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { choiceIndex?: number };
  const choiceIndex = typeof body.choiceIndex === "number" ? body.choiceIndex : -1;
  if (choiceIndex < 0) {
    return NextResponse.json({ error: "Missing choiceIndex" }, { status: 400 });
  }

  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { simulation: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (attempt.finished) {
    return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
  }

  const payload = attempt.simulation.payload as unknown as SimulationPayload;
  const state: AttemptState = {
    week: attempt.week,
    scenarioIndex: attempt.scenarioIndex,
    stats: attempt.stats as unknown as AttemptStats,
    log: attempt.log as unknown as LogEntry[],
    finished: attempt.finished,
  };

  const result = applyChoice(payload, state, choiceIndex);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid choice or scenario already resolved" },
      { status: 400 },
    );
  }

  let finalScore: number | null = null;
  let finalTier: string | null = null;
  if (result.state.finished) {
    const review = computeReview(payload, result.state);
    finalScore = review.score;
    finalTier = review.tier;
  }

  const updated = await prisma.simulationAttempt.update({
    where: { id: attemptId },
    data: {
      week: result.state.week,
      scenarioIndex: result.state.scenarioIndex,
      stats: result.state.stats as unknown as object,
      log: result.state.log as unknown as object,
      finished: result.state.finished,
      finishedAt: result.state.finished ? new Date() : null,
      finalScore,
      finalTier,
    },
  });

  return NextResponse.json({
    week: updated.week,
    scenarioIndex: updated.scenarioIndex,
    stats: updated.stats,
    finished: updated.finished,
    finalScore: updated.finalScore,
    finalTier: updated.finalTier,
    entry: result.entry,
  });
}
