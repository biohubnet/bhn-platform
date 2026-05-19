/**
 * POST /api/simulator/[attemptId]/reset
 *
 * Resets a trainee's attempt back to week 1 with starting stats and an
 * empty log. The Simulation row stays as-is so the AI cost isn't paid
 * again. Useful for "try again with different choices" without paying
 * the generation cost.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initialState } from "@/lib/simulator/engine";
import type { SimulationPayload } from "@/lib/simulator/types";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { attemptId } = await ctx.params;

  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { simulation: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = attempt.simulation.payload as unknown as SimulationPayload;
  const seed = initialState(payload);

  await prisma.simulationAttempt.update({
    where: { id: attemptId },
    data: {
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
      finishedAt: null,
      finalScore: null,
      finalTier: null,
    },
  });

  return NextResponse.json({ ok: true });
}
