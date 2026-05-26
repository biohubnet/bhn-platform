/**
 * GET  /api/admin/simulations/[id] — read the current SimulationPayload
 *                                     JSON for the in-page editor.
 * PUT  /api/admin/simulations/[id] — overwrite payload + denormalised
 *                                     columns. Same validator the AI and
 *                                     hand-author paths use.
 *
 * Caveat: editing a Simulation that already has SimulationAttempt rows
 * IN PROGRESS will surface the new payload to those players on their
 * next render. State that was checkpointed against the old scenarios
 * still loads (the engine reads the current week + scenarioIndex and
 * looks up the scenario by index from the new array). If you delete
 * or reorder scenarios mid-quarter for a live player you'll confuse
 * them — the editor surfaces a warning when that's the case.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePayload } from "@/lib/simulator/validate";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const sim = await prisma.simulation.findUnique({
    where: { id },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      location: true,
      sourceUrl: true,
      sourceHash: true,
      modelUsed: true,
      promptVersion: true,
      createdAt: true,
      payload: true,
      _count: { select: { attempts: true } },
    },
  });
  if (!sim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // How many attempts are still in-flight? Drives the "this will
  // affect N players mid-quarter" warning in the editor.
  const attemptsInProgress = await prisma.simulationAttempt.count({
    where: { simulationId: id, finished: false },
  });
  return NextResponse.json({
    ok: true,
    simulation: {
      id: sim.id,
      jobTitle: sim.jobTitle,
      companyName: sim.companyName,
      location: sim.location,
      sourceUrl: sim.sourceUrl,
      sourceHash: sim.sourceHash,
      modelUsed: sim.modelUsed,
      promptVersion: sim.promptVersion,
      createdAt: sim.createdAt.toISOString(),
      totalAttempts: sim._count.attempts,
      attemptsInProgress,
    },
    payload: sim.payload,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { payload?: unknown };
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json(
      { error: "Provide a payload object in the body." },
      { status: 400 },
    );
  }
  // Re-validate via the canonical path. Same checks as AI + hand-author.
  const validated = validatePayload(body.payload as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: `Payload didn't validate: ${validated.error}` },
      { status: 400 },
    );
  }
  const sim = await prisma.simulation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!sim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Overwrite payload AND the denormalised columns derived from it, so
  // listings on /simulator and the admin queue stay accurate.
  await prisma.simulation.update({
    where: { id },
    data: {
      jobTitle: validated.payload.jobTitle,
      companyName: validated.payload.companyName,
      location: validated.payload.location,
      payload: validated.payload as unknown as object,
    },
  });
  return NextResponse.json({ ok: true });
}
