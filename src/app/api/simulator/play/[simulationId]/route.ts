/**
 * POST /api/simulator/play/[simulationId]
 *
 * Open access (any signed-in user). Creates a fresh SimulationAttempt
 * for the caller on the given Simulation row and returns the attemptId
 * so the client can redirect to the player.
 *
 * Why a separate route from /api/simulator/start
 * ──────────────────────────────────────────────
 *   • /api/simulator/start is admin-only now (self-serve AI generation
 *     was retired); it takes a JD body, runs the generator, and
 *     produces a Simulation row. This route assumes the Simulation
 *     already exists — no AI cost, no JD parsing, instant.
 *   • The shape is "play this catalog item" — the calling user is the
 *     player, the simulation is the platform-published content.
 *
 * Distinct from /api/admin/simulations/[id]/test-attempt
 *   • That endpoint is gated to admins; it's a "did the payload land
 *     right?" smoke-test on an admin's own account.
 *   • This endpoint is gated to every signed-in user; it's the
 *     production play surface for the published catalog.
 *
 * Re-playability: each call creates a NEW Attempt. We don't dedupe
 * against "do you already have an unfinished attempt for this
 * simulation?" because the client surfaces a Resume affordance for
 * that case — by the time you reach this endpoint you've explicitly
 * picked Replay / New attempt.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initialState } from "@/lib/simulator/engine";
import type { SimulationPayload } from "@/lib/simulator/types";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session missing user id." }, { status: 401 });
  }

  const { simulationId } = await params;
  const simulation = await prisma.simulation.findUnique({
    where: { id: simulationId },
    select: { id: true, payload: true, jobTitle: true, companyName: true },
  });
  if (!simulation) {
    return NextResponse.json({ error: "Simulation not found." }, { status: 404 });
  }

  // Initialise the engine state from the payload (week, scenarioIndex,
  // starting stats). Same helper /api/simulator/start uses so attempts
  // launched from either path start in a consistent state.
  const payload = simulation.payload as unknown as SimulationPayload;
  const seed = initialState(payload);

  const attempt = await prisma.simulationAttempt.create({
    data: {
      simulationId: simulation.id,
      userId,
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    simulationId: simulation.id,
    jobTitle: simulation.jobTitle,
    companyName: simulation.companyName,
  });
}
