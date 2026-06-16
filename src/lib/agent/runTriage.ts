/**
 * The autonomous triage agent's run loop. Guardrails:
 *   - KILL SWITCH: no-ops unless the PlatformSetting flag is on (default off).
 *   - SCOPE: only open, flagged, not-yet-triaged answers; capped batch.
 *   - OUTPUT VALIDATION: triageAnswer() returns only zod-validated results.
 *   - HUMAN APPROVAL: the agent proposes (writes a note, escalates by severity)
 *     but NEVER resolves — a human still acts in /admin/ai-review.
 *   - IDEMPOTENCY: each row is stamped agentTriagedAt so it's processed once.
 * Every run is recorded in AgentRun (for the dashboard + before/after metric).
 */
import { prisma } from "@/lib/prisma";
import { triageAnswer } from "@/lib/ai/triage";
import { TRIAGE_AGENT, isAgentEnabled } from "./config";

export interface TriageRunResult {
  skipped?: string;
  processed: number;
  proposed: number;
  durationMs: number;
  runId: string | null;
}

export async function runTriageAgent(trigger: "schedule" | "manual"): Promise<TriageRunResult> {
  if (!(await isAgentEnabled())) {
    return { skipped: "agent disabled (kill switch off)", processed: 0, proposed: 0, durationMs: 0, runId: null };
  }

  const run = await prisma.agentRun.create({ data: { agent: "triage", trigger } });
  const started = Date.now();

  const items = await prisma.aIInteraction.findMany({
    where: { flaggedForReview: true, reviewStatus: "open", agentTriagedAt: null, answerExcerpt: { not: null } },
    orderBy: { createdAt: "asc" },
    take: TRIAGE_AGENT.batchCap,
    select: { id: true, answerExcerpt: true, userRating: true, confidence: true },
  });

  let processed = 0;
  let proposed = 0;
  for (const it of items) {
    const reason =
      it.userRating != null && it.userRating < 0
        ? "a user rated it thumbs-down"
        : `low confidence (${Math.round((it.confidence ?? 0) * 100)}%)`;
    const triage = await triageAnswer({ answer: it.answerExcerpt ?? "", reason });
    processed++;

    if (triage) {
      proposed++;
      const note = `[agent] ${triage.category} · ${triage.severity}: ${triage.suggestion}`;
      await prisma.aIInteraction
        .update({
          where: { id: it.id },
          data: {
            agentTriagedAt: new Date(),
            reviewNote: note,
            // High-severity gets escalated for a human; nothing is auto-resolved.
            reviewStatus: triage.severity === "high" ? "escalated" : "open",
          },
        })
        .catch(() => {});
    } else {
      // Validation failed / AI unavailable — still stamp so we don't loop on it.
      await prisma.aIInteraction.update({ where: { id: it.id }, data: { agentTriagedAt: new Date() } }).catch(() => {});
    }
  }

  const durationMs = Date.now() - started;
  await prisma.agentRun
    .update({
      where: { id: run.id },
      data: { finishedAt: new Date(), itemsProcessed: processed, itemsProposed: proposed, durationMs, summary: `triaged ${processed}, proposed ${proposed}` },
    })
    .catch(() => {});

  return { processed, proposed, durationMs, runId: run.id };
}
