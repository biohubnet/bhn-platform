/**
 * Admin → AI triage agent. An autonomous agent (orchestrated by Inngest, not a
 * Vercel cron handler) that triages review-flagged AI answers into the queue.
 * This page is its control surface: kill switch, run-now, the manual-vs-agent
 * before/after throughput metric, and recent run history.
 */
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { AiAgentPanel, type AgentRunRow } from "@/components/admin/AiAgentPanel";
import { isAgentEnabled, manualBaselineSeconds } from "@/lib/agent/config";

export const dynamic = "force-dynamic";

export default async function AiAgentPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [enabled, baselineSec, runs, sums, openQueue] = await Promise.all([
    isAgentEnabled(),
    manualBaselineSeconds(),
    prisma.agentRun.findMany({ orderBy: { startedAt: "desc" }, take: 12 }),
    prisma.agentRun.aggregate({ _sum: { itemsProcessed: true } }),
    prisma.aIInteraction.count({ where: { flaggedForReview: true, reviewStatus: "open" } }),
  ]);

  const finished = runs.filter((r) => r.itemsProcessed > 0 && r.durationMs != null);
  const totItems = finished.reduce((s, r) => s + r.itemsProcessed, 0);
  const totMs = finished.reduce((s, r) => s + (r.durationMs ?? 0), 0);
  const agentSecPerItem = totItems ? Math.round((totMs / totItems / 1000) * 10) / 10 : null;
  const savedPerItem = agentSecPerItem != null ? Math.max(0, baselineSec - agentSecPerItem) : null;
  const totalProcessed = sums._sum.itemsProcessed ?? 0;
  const hoursSaved = savedPerItem != null ? Math.round((totalProcessed * savedPerItem / 3600) * 10) / 10 : null;

  const rows: AgentRunRow[] = runs.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    startedAt: r.startedAt.toISOString(),
    itemsProcessed: r.itemsProcessed,
    itemsProposed: r.itemsProposed,
    durationMs: r.durationMs,
    ok: r.ok,
    summary: r.summary,
  }));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Bot size={11} /> Admin · AI agent</>}
        title="Triage agent"
        description="An autonomous agent that reads the AI review queue, classifies each flagged answer (category + severity), and proposes an action for a human — it never resolves on its own. Orchestrated by Inngest (durable, retried, one run at a time) on a 6-hour schedule, or run on demand here."
      />
      <AiAgentPanel
        enabled={enabled}
        baselineSec={baselineSec}
        agentSecPerItem={agentSecPerItem}
        savedPerItem={savedPerItem}
        totalProcessed={totalProcessed}
        hoursSaved={hoursSaved}
        openQueue={openQueue}
        runs={rows}
      />
    </div>
  );
}
