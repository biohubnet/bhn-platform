/**
 * POST /api/admin/simulator-requests/[id]/hand-author
 *
 * Admin uploads a hand-authored SimulationPayload (typically JSON they
 * built themselves or copied from a known-good template). Runs the
 * payload through the same validator the AI path uses, then fulfills
 * the request — Simulation row + first SimulationAttempt + status → ready.
 *
 *   Body: { payload: SimulationPayload }
 *
 * The escape hatch for when both Gemini and Cloudflare are unavailable
 * — the workflow this whole feature was designed around.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePayload } from "@/lib/simulator/validate";
import { fulfillWithNewPayload } from "@/lib/simulator/request-fulfillment";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = (session.user as { id?: string }).id;
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const request = await prisma.simulationRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status === "ready") {
    return NextResponse.json(
      { error: "Request is already fulfilled — reopen it first." },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { payload?: unknown };
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json(
      { error: "Provide a payload object in the body." },
      { status: 400 },
    );
  }

  // Same validator the AI path runs through, so a hand-authored
  // payload that passes here behaves identically at runtime.
  const validated = validatePayload(body.payload as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: `Payload didn't validate: ${validated.error}` },
      { status: 400 },
    );
  }

  const result = await fulfillWithNewPayload({
    requestId: id,
    payload: validated.payload,
    modelUsed: "hand-authored",
    generationMs: 0,
    adminId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: "ready",
    simulationId: result.simulationId,
    attemptId: result.attemptId,
  });
}
