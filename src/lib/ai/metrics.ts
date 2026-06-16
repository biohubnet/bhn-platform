/**
 * Aggregations over the AIInteraction telemetry log for /admin/ai-metrics:
 * call volume, error/timeout rate, p50/p95 latency, cost, valid-output
 * (acceptance) rate, plus per-day and per-feature breakdowns. Date-windowed.
 */
import { prisma } from "@/lib/prisma";

export interface DayPoint { date: string; calls: number; errors: number; costUsd: number }
export interface FeatureRow { feature: string; calls: number; errorRate: number; avgLatencyMs: number | null; costUsd: number }

export interface AiMetrics {
  days: number;
  totalCalls: number;
  errorRate: number;            // 0..1 — success === false share
  validRate: number | null;     // validationPassed true / validated calls; null when no validated calls
  validatedCalls: number;
  acceptanceRate: number | null; // thumbs-up / rated calls; null when none rated
  ratedCalls: number;
  openReviews: number;          // flagged answers awaiting human review (all-time)
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  totalCostUsd: number;
  promptTokens: number;
  completionTokens: number;
  byDay: DayPoint[];
  byFeature: FeatureRow[];
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

export async function getAiMetrics(days: number): Promise<AiMetrics> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [rows, openReviews] = await Promise.all([
    prisma.aIInteraction.findMany({
      where: { createdAt: { gte: since } },
      select: {
        kind: true, success: true, latencyMs: true, costUsd: true,
        promptTokens: true, completionTokens: true, validationPassed: true,
        userRating: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aIInteraction.count({ where: { flaggedForReview: true } }),
  ]);

  const totalCalls = rows.length;
  const errors = rows.filter((r) => !r.success).length;
  const validated = rows.filter((r) => r.validationPassed !== null);
  const validPassed = validated.filter((r) => r.validationPassed === true).length;
  const rated = rows.filter((r) => r.userRating !== null);
  const accepted = rated.filter((r) => (r.userRating ?? 0) > 0).length;
  const latencies = rows.filter((r) => r.success && typeof r.latencyMs === "number").map((r) => r.latencyMs as number).sort((a, b) => a - b);

  const dayMap = new Map<string, DayPoint>();
  const featMap = new Map<string, { calls: number; errors: number; latSum: number; latN: number; cost: number }>();
  let totalCostUsd = 0, promptTokens = 0, completionTokens = 0;

  for (const r of rows) {
    totalCostUsd += r.costUsd ?? 0;
    promptTokens += r.promptTokens ?? 0;
    completionTokens += r.completionTokens ?? 0;

    const date = r.createdAt.toISOString().slice(0, 10);
    const d = dayMap.get(date) ?? { date, calls: 0, errors: 0, costUsd: 0 };
    d.calls++; if (!r.success) d.errors++; d.costUsd += r.costUsd ?? 0;
    dayMap.set(date, d);

    const f = featMap.get(r.kind) ?? { calls: 0, errors: 0, latSum: 0, latN: 0, cost: 0 };
    f.calls++; if (!r.success) f.errors++; f.cost += r.costUsd ?? 0;
    if (typeof r.latencyMs === "number") { f.latSum += r.latencyMs; f.latN++; }
    featMap.set(r.kind, f);
  }

  return {
    days,
    totalCalls,
    errorRate: totalCalls ? errors / totalCalls : 0,
    validRate: validated.length ? validPassed / validated.length : null,
    validatedCalls: validated.length,
    acceptanceRate: rated.length ? accepted / rated.length : null,
    ratedCalls: rated.length,
    openReviews,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    totalCostUsd: Math.round(totalCostUsd * 1e6) / 1e6,
    promptTokens,
    completionTokens,
    byDay: [...dayMap.values()].map((d) => ({ ...d, costUsd: Math.round(d.costUsd * 1e6) / 1e6 })),
    byFeature: [...featMap.entries()]
      .map(([feature, f]) => ({
        feature,
        calls: f.calls,
        errorRate: f.calls ? f.errors / f.calls : 0,
        avgLatencyMs: f.latN ? Math.round(f.latSum / f.latN) : null,
        costUsd: Math.round(f.cost * 1e6) / 1e6,
      }))
      .sort((a, b) => b.calls - a.calls),
  };
}
