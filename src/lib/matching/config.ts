/**
 * Runtime-tunable matching-engine configuration.
 *
 * The fit scorer in src/lib/matching/fit.ts used to ship as hardcoded
 * constants. This module persists those constants in the existing
 * PlatformSetting key/value table under key="matching" (single JSON
 * blob, simplest schema-free option) and exposes typed get/save
 * helpers.
 *
 * Why DB-backed + not env vars
 *   • An admin who wants to tweak weights shouldn't need a deploy.
 *   • The audit trail (who changed what, when) is a regulatory
 *     expectation in any explainable-ML setting — DB rows + AuditLog
 *     give that for free.
 *   • Defaults stay in code (the DEFAULT_MATCHING_CONFIG constant) so
 *     a fresh install / wiped DB still scores correctly.
 *
 * Convention
 *   Weights direct + semantic + pathway should sum to 100. The save
 *   helper enforces this so a misconfigured panel can't produce
 *   nonsensical scores in production. Everything else is range-checked.
 */
import { prisma } from "@/lib/prisma";

export interface MatchingConfig {
  /** Subscore caps. Should sum to 100. */
  weights: {
    direct: number;
    semantic: number;
    pathway: number;
  };
  /** Band thresholds on the final 0..100 score. */
  bands: {
    /** Score ≥ this → "high" (Strong fit). */
    high: number;
    /** Score ≥ this AND < high → "medium" (Possible fit). Below → "low". */
    medium: number;
  };
  /** All the small constants the scorer touches. */
  thresholds: {
    /** Skills on file below this number → confidence-cap kicks in. */
    profileCompleteness: number;
    /** Cosine similarity at/above which a "semantic bridge" is shown. */
    semanticBridgeMin: number;
    /** Cosine similarity at/above which a completed pathway contributes. */
    pathwayAlignMin: number;
    /** Points contributed per qualifying completed pathway. Capped at
     *  weights.pathway in aggregate. */
    perPathwayBoost: number;
    /** Bonus added to a PostingSkill.weight when `required=true`. */
    requiredSkillBonus: number;
    /** Postings with fewer tagged skills than this → confidence gets
     *  a soft cap (signal is noisier). */
    minPostingSkillsForFullConfidence: number;
  };
}

/** The constants that shipped with the original engine. The scorer
 *  falls back to these whenever no row is found in PlatformSetting. */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: { direct: 50, semantic: 30, pathway: 20 },
  bands: { high: 70, medium: 40 },
  thresholds: {
    profileCompleteness: 5,
    semanticBridgeMin: 0.55,
    pathwayAlignMin: 0.55,
    perPathwayBoost: 10,
    requiredSkillBonus: 0.5,
    minPostingSkillsForFullConfidence: 3,
  },
};

const SETTING_KEY = "matching";

/** Read the current config, falling back to defaults on any failure
 *  (DB unreachable, malformed JSON, missing field). Never throws so
 *  callers can use this on hot paths without try/catch. */
export async function getMatchingConfig(): Promise<MatchingConfig> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    });
    if (!row) return DEFAULT_MATCHING_CONFIG;
    const parsed = JSON.parse(row.value) as Partial<MatchingConfig>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_MATCHING_CONFIG;
  }
}

/** Validate, clamp, and persist. Returns the saved (clamped) config. */
export async function saveMatchingConfig(
  input: Partial<MatchingConfig>,
  actorId: string,
): Promise<MatchingConfig> {
  const next = mergeWithDefaults(input);
  // Hard rule: weights must sum to 100 (rounded). Clamp the residual
  // onto direct so the panel can't produce a 0-summing config.
  const sum = next.weights.direct + next.weights.semantic + next.weights.pathway;
  if (sum !== 100) {
    const residual = 100 - sum + next.weights.direct;
    next.weights.direct = Math.max(0, Math.min(100, Math.round(residual)));
  }
  await prisma.platformSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  await prisma.auditLog
    .create({
      data: {
        actorId,
        action: "matching.config.update",
        targetType: "PlatformSetting",
        targetId: SETTING_KEY,
        detail: JSON.stringify({ config: next }),
      },
    })
    .catch(() => undefined);
  return next;
}

/** Deep-merge a partial config with defaults, range-checking every
 *  field. Used by both the loader and the saver so the same shape +
 *  bounds rules apply on both sides. */
function mergeWithDefaults(input: Partial<MatchingConfig>): MatchingConfig {
  const d = DEFAULT_MATCHING_CONFIG;
  const i = input;
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const clampPos = (n: number, fallback: number, max = 100) =>
    Number.isFinite(n) && n >= 0 ? Math.min(max, n) : fallback;
  return {
    weights: {
      direct: clampPct(i.weights?.direct ?? d.weights.direct),
      semantic: clampPct(i.weights?.semantic ?? d.weights.semantic),
      pathway: clampPct(i.weights?.pathway ?? d.weights.pathway),
    },
    bands: {
      high:   clampPct(i.bands?.high   ?? d.bands.high),
      medium: clampPct(i.bands?.medium ?? d.bands.medium),
    },
    thresholds: {
      profileCompleteness:
        clampPos(i.thresholds?.profileCompleteness ?? d.thresholds.profileCompleteness, d.thresholds.profileCompleteness, 100),
      semanticBridgeMin:
        clamp01(i.thresholds?.semanticBridgeMin ?? d.thresholds.semanticBridgeMin),
      pathwayAlignMin:
        clamp01(i.thresholds?.pathwayAlignMin ?? d.thresholds.pathwayAlignMin),
      perPathwayBoost:
        clampPos(i.thresholds?.perPathwayBoost ?? d.thresholds.perPathwayBoost, d.thresholds.perPathwayBoost, 100),
      requiredSkillBonus:
        clampPos(i.thresholds?.requiredSkillBonus ?? d.thresholds.requiredSkillBonus, d.thresholds.requiredSkillBonus, 10),
      minPostingSkillsForFullConfidence:
        clampPos(i.thresholds?.minPostingSkillsForFullConfidence ?? d.thresholds.minPostingSkillsForFullConfidence, d.thresholds.minPostingSkillsForFullConfidence, 50),
    },
  };
}
