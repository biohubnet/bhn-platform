/**
 * POST /api/admin/simulations/[id]/test-attempt
 *
 * Creates a fresh SimulationAttempt for the calling admin against a
 * published Simulation. The intent is editorial: after tweaking the
 * payload (or just to review a colleague's sim) the admin spins up a
 * playthrough on their own account to see how it lands.
 *
 * Always creates a NEW attempt — never reuses an existing one — so
 * the admin sees the latest payload from week 1 with starting stats.
 * Their old test attempts hang around on /simulator until they reset
 * or finish them; that's fine, they're plainly visible.
 *
 * Returns { attemptId } so the client can redirect to the player.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initialState } from "@/lib/simulator/engine";
import type { SimulationPayload } from "@/lib/simulator/types";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sim = await prisma.simulation.findUnique({
    where: { id },
    select: { id: true, payload: true },
  });
  if (!sim) {
    return NextResponse.json({ error: "Simulation not found." }, { status: 404 });
  }

  const payload = sim.payload as unknown as SimulationPayload;
  const seed = initialState(payload);

  const attempt = await prisma.simulationAttempt.create({
    data: {
      simulationId: sim.id,
      userId,
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, attemptId: attempt.id });
}
