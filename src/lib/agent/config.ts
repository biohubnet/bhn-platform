/**
 * Triage-agent guardrail config: a kill switch (PlatformSetting, default OFF),
 * a per-run scope cap, and the manual-baseline used for the before/after metric.
 */
import { prisma } from "@/lib/prisma";

export const TRIAGE_AGENT = {
  /** PlatformSetting kill switch / feature flag. "1" = on. Default off (opt-in). */
  enabledKey: "aiTriageAgentEnabled",
  /** PlatformSetting: seconds a human takes to triage one answer (baseline). */
  baselineKey: "manualTriageSecondsPerItem",
  /** Scope limit: max flagged answers processed per run. */
  batchCap: 10,
  /** Default manual-triage baseline (seconds/item) if none configured. */
  defaultManualSeconds: 180,
} as const;

export async function isAgentEnabled(): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({ where: { key: TRIAGE_AGENT.enabledKey } }).catch(() => null);
  return row?.value === "1";
}

export async function manualBaselineSeconds(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: TRIAGE_AGENT.baselineKey } }).catch(() => null);
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : TRIAGE_AGENT.defaultManualSeconds;
}
