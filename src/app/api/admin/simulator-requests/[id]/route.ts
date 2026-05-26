/**
 * DELETE /api/admin/simulator-requests/[id]
 *
 * Admin permanently removes a simulation request from the queue.
 *
 * Linked-row policy
 * ─────────────────
 *   • SimulationRequest.simulation (FK → Simulation) is the request's
 *     attached payload. We deliberately do NOT delete the Simulation
 *     row here — other requests with the same sourceHash may be
 *     linked to it, and admins may want the playable sim to stick
 *     around even after the request is cleaned up. The Simulation can
 *     be deleted separately from /admin/simulations.
 *   • JobFolder.simulationRequest (FK → SimulationRequest) is set to
 *     onDelete: SetNull in schema.prisma — folders that linked to the
 *     request automatically have their FK cleared. The folder itself
 *     and the linked Simulation are untouched.
 *
 * Guard rails
 * ───────────
 *   • Admin role only (requireRole).
 *   • status === "generating" is blocked: the AI generation
 *     fulfillWithNewPayload path runs to completion in another
 *     request and races to update this row. Deleting mid-flight
 *     would either orphan the result or surface a confusing Prisma
 *     P2025 to the AI worker. Admin must wait for the generation
 *     to settle (it's < 60s typical, and the worker writes either
 *     "ready" or "failed" on completion).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.simulationRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (existing.status === "generating") {
    return NextResponse.json(
      {
        error:
          "Can't delete while a generation is in flight — wait for the AI worker to finish (it'll resolve to ready or failed), then delete.",
      },
      { status: 409 },
    );
  }

  await prisma.simulationRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
