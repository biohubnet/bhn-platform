/**
 * Shared fulfillment helpers for SimulationRequest.
 *
 * fulfillWithExistingSimulation — link a request to an existing
 *   Simulation row (cache hit path).
 * fulfillWithNewPayload — create a fresh Simulation row from an
 *   admin-supplied SimulationPayload (AI-generated or hand-authored)
 *   and link the request to it.
 *
 * Both paths:
 *   - flip the request to status=ready
 *   - stamp processedById / processedAt
 *   - eagerly create the requester's first SimulationAttempt
 *   - write a Notification telling the requester their sim is ready
 *
 * The requester's first Attempt is auto-created so the user can click
 * "Play" on their dashboard and land directly in week 1 — no extra
 * intermediate step. The Attempt row is what the existing
 * /simulator/[attemptId] page reads.
 */
import { prisma } from "@/lib/prisma";
import { initialState } from "./engine";
import type { SimulationPayload } from "./types";
import { PROMPT_VERSION } from "./types";

// v1 ships without a notification row. The existing Notification
// table is employer-scoped (requires companyId + activityLogId), so
// adding a generic-user notification is its own piece of work. For
// now the user sees status transitions when they reload /simulator
// — that page renders the "Requested" section by reading
// SimulationRequest.status directly. A follow-up commit can wire in
// either email or a generic user-notification model.
//
// Keep this helper as a single touch-point so the upgrade is local.
async function notifyRequester(_args: {
  requesterId: string;
  jobTitle: string;
  attemptId: string;
}) {
  // intentionally a no-op in v1
}

export async function fulfillWithExistingSimulation(args: {
  requestId: string;
  simulationId: string;
  adminId: string;
}): Promise<{ ok: true; attemptId: string } | { ok: false; error: string }> {
  const request = await prisma.simulationRequest.findUnique({
    where: { id: args.requestId },
    select: { id: true, userId: true, status: true },
  });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status === "ready") {
    return { ok: false, error: "Request is already fulfilled." };
  }

  const simulation = await prisma.simulation.findUnique({
    where: { id: args.simulationId },
    select: { id: true, jobTitle: true, payload: true },
  });
  if (!simulation) return { ok: false, error: "Simulation not found." };

  const payload = simulation.payload as unknown as SimulationPayload;
  const seed = initialState(payload);

  const attempt = await prisma.simulationAttempt.create({
    data: {
      simulationId: simulation.id,
      userId: request.userId,
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
    },
    select: { id: true },
  });

  await prisma.simulationRequest.update({
    where: { id: args.requestId },
    data: {
      simulationId: simulation.id,
      status: "ready",
      processedById: args.adminId,
      processedAt: new Date(),
    },
  });

  await notifyRequester({
    requesterId: request.userId,
    jobTitle: simulation.jobTitle,
    attemptId: attempt.id,
  });

  return { ok: true, attemptId: attempt.id };
}

export async function fulfillWithNewPayload(args: {
  requestId: string;
  payload: SimulationPayload;
  modelUsed: string;
  generationMs: number;
  adminId: string;
}): Promise<{ ok: true; attemptId: string; simulationId: string } | { ok: false; error: string }> {
  const request = await prisma.simulationRequest.findUnique({
    where: { id: args.requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      sourceUrl: true,
      sourceHash: true,
      jdBody: true,
    },
  });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status === "ready") {
    return { ok: false, error: "Request is already fulfilled." };
  }

  // Re-check for a cache hit by hash — a different admin might have
  // generated the same JD in parallel. If so, link to the existing one
  // instead of creating a duplicate Simulation row.
  const existing = await prisma.simulation.findUnique({
    where: { sourceHash: request.sourceHash },
    select: { id: true },
  });

  const simulationId = existing
    ? existing.id
    : (
        await prisma.simulation.create({
          data: {
            sourceHash: request.sourceHash,
            sourceUrl: request.sourceUrl,
            jdSnippet: request.jdBody.slice(0, 800),
            jobTitle: args.payload.jobTitle,
            companyName: args.payload.companyName,
            location: args.payload.location,
            payload: args.payload as unknown as object,
            modelUsed: args.modelUsed,
            generationMs: args.generationMs,
            promptVersion: PROMPT_VERSION,
            createdById: args.adminId,
          },
          select: { id: true },
        })
      ).id;

  const seed = initialState(args.payload);
  const attempt = await prisma.simulationAttempt.create({
    data: {
      simulationId,
      userId: request.userId,
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
    },
    select: { id: true },
  });

  await prisma.simulationRequest.update({
    where: { id: args.requestId },
    data: {
      simulationId,
      status: "ready",
      processedById: args.adminId,
      processedAt: new Date(),
    },
  });

  await notifyRequester({
    requesterId: request.userId,
    jobTitle: args.payload.jobTitle,
    attemptId: attempt.id,
  });

  return { ok: true, attemptId: attempt.id, simulationId };
}
