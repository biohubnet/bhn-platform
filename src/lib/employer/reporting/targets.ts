/**
 * Hiring targets (OKRs) — load + resolve actual-vs-target RAG.
 * The metricKey allowlist is the single registry the settings UI, the
 * API validation, and every metric module agree on.
 */
import { prisma } from "@/lib/prisma";
import type { Comparator, MetricResult } from "./types";
import { resolveRag } from "./rag";

export const TARGET_METRICS: {
  key: string;
  label: string;
  comparator: Comparator;
  unit: "days" | "percent" | "currency" | "count" | "ratio";
  hint: string;
}[] = [
  { key: "hires",              label: "Hires",                comparator: "gte", unit: "count",    hint: "Number of hires in the period" },
  { key: "applications",       label: "Applications",         comparator: "gte", unit: "count",    hint: "Applications received in the period" },
  { key: "time_to_fill_days",  label: "Time to fill",         comparator: "lte", unit: "days",     hint: "Median days from req open to hire" },
  { key: "time_to_hire_days",  label: "Time to hire",         comparator: "lte", unit: "days",     hint: "Median days from apply to hire" },
  { key: "offer_accept_rate",  label: "Offer acceptance",     comparator: "gte", unit: "percent",  hint: "Accepted / responded offers (0–100)" },
  { key: "apply_to_hire_rate", label: "Apply→hire rate",      comparator: "gte", unit: "percent",  hint: "Hires / applications (0–100)" },
  { key: "cost_per_hire",      label: "Cost per hire",        comparator: "lte", unit: "currency", hint: "Total recruiting spend / hires" },
];

export const TARGET_METRIC_KEYS = TARGET_METRICS.map((m) => m.key);
const META = new Map(TARGET_METRICS.map((m) => [m.key, m]));

export function defaultComparator(metricKey: string): Comparator {
  return META.get(metricKey)?.comparator ?? "gte";
}

export interface LoadedTarget {
  metricKey: string;
  target: number;
  comparator: Comparator;
  atRiskBand: number | null;
  postingId: string | null;
}

/**
 * All company targets keyed by metricKey. A company-wide target
 * (postingId = null) wins over a posting-scoped one for the headline
 * tiles. Decimal columns are converted to numbers at this boundary.
 */
export async function loadTargets(companyId: string): Promise<Map<string, LoadedTarget>> {
  const rows = await prisma.hiringTarget
    .findMany({
      where: { companyId },
      select: { metricKey: true, targetValue: true, comparator: true, atRiskBand: true, postingId: true },
    })
    .catch(() => []);

  const map = new Map<string, LoadedTarget>();
  for (const r of rows) {
    const t: LoadedTarget = {
      metricKey: r.metricKey,
      target: Number(r.targetValue),
      comparator: (r.comparator as Comparator) || defaultComparator(r.metricKey),
      atRiskBand: r.atRiskBand == null ? null : Number(r.atRiskBand),
      postingId: r.postingId,
    };
    const existing = map.get(r.metricKey);
    // Prefer company-wide; only let a posting-scoped target fill a gap.
    if (!existing || (existing.postingId && !t.postingId)) map.set(r.metricKey, t);
  }
  return map;
}

/** Attach RAG + target + pctToGoal to a metric result. */
export function applyTarget(
  result: MetricResult,
  metricKey: string,
  targets: Map<string, LoadedTarget>,
): MetricResult {
  const t = targets.get(metricKey);
  const comparator = t?.comparator ?? defaultComparator(metricKey);
  const { rag, pctToGoal } = resolveRag(result.value, t?.target ?? null, comparator, t?.atRiskBand ?? 0.1);
  return { ...result, rag, pctToGoal, target: t?.target ?? null };
}
