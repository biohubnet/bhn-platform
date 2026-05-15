/**
 * Trainee ↔ posting fit-scoring.
 *
 * This is the "AI matching" engine in plain language: it produces an
 * explainable 0–100 score for a given (trainee, posting) pair, plus
 * the receipts the UI needs to render a "why this match?" panel
 * honestly.
 *
 * Three subscores, weighted to 100:
 *
 *   directOverlap       /50    Skills the trainee has that the posting
 *                              explicitly requires/wants. Weighted by
 *                              PostingSkill.weight + a +0.5 bump if
 *                              required.
 *   semanticSimilarity  /30    For posting skills the trainee does NOT
 *                              hold directly, average pgvector cosine
 *                              similarity between the posting skill's
 *                              embedding and the trainee's nearest held
 *                              skill embedding. Captures "you have
 *                              'cell culture'; posting wants 'mammalian
 *                              cell culture'" — semantically adjacent.
 *   pathwayAlignment    /20    Completed pathways whose embedding is
 *                              cosine-close to the posting's required-
 *                              skills centroid. Flat bonus per matching
 *                              completed pathway, up to /20.
 *
 * Confidence (0..1) — falls when the trainee's profile is too thin to
 * trust the score. Sub-5 skills → confidence cap at 0.5. The UI uses
 * this to decide whether to show a number, a band ("medium fit"), or
 * just "complete your profile."
 *
 * Caveats — string array surfaced verbatim in the explanation panel.
 * These are the honest limits ("posting hasn't been ontology-tagged",
 * "you haven't added skills yet", etc.). Always show; never silently
 * fail.
 *
 * Why this lives in one file: the scoring rules ARE the product
 * contract. Splitting them across modules would let drift creep in
 * between "score" and "explanation". Single source of truth.
 */

// `Prisma` is imported as a value (not just a type) because we use
// `Prisma.sql` and `Prisma.join` at runtime to build pgvector-aware
// raw queries that Prisma's query API can't express natively.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Public types ─────────────────────────────────────────────────

export interface FitSubscore {
  /** Achieved score in this subscore. */
  score: number;
  /** Max possible in this subscore (50 / 30 / 20). */
  max: number;
}

export interface FitResult {
  /** Total 0..100, rounded. */
  score: number;
  /** Banding for UI copy: "high" ≥ 70, "medium" 40..69, "low" < 40. */
  band: "high" | "medium" | "low";
  /** 0..1 — how much we trust this score. Drops on thin profiles. */
  confidence: number;
  subscores: {
    directOverlap: FitSubscore;
    semanticSimilarity: FitSubscore;
    pathwayAlignment: FitSubscore;
  };
  /** Skills the trainee holds AND the posting requires. UI lists these as evidence. */
  matched: { skillId: string; name: string; required: boolean }[];
  /** Required posting skills the trainee does NOT hold directly. */
  missingRequired: { skillId: string; name: string }[];
  /** Posting skills the trainee doesn't hold but has a semantically close skill for. */
  semanticBridges: {
    postingSkill: { id: string; name: string };
    nearestUserSkill: { id: string; name: string };
    cosine: number;
  }[];
  /** Completed pathways that contributed to the pathway-alignment bonus. */
  pathwaysCounting: { id: string; title: string; cosine: number }[];
  /** Honest caveats — render verbatim in the explanation UI. */
  caveats: string[];
  /** ISO timestamp for "last computed at". */
  computedAt: string;
}

// ── Constants ────────────────────────────────────────────────────
//
// These mirror the DEFAULT_MATCHING_CONFIG in src/lib/matching/config.ts
// and are referenced only as documentation + as a "last resort" when
// the scorer is called without an explicit config and config.ts is
// unavailable. The actual runtime values flow through MatchingConfig.

import {
  type MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
  getMatchingConfig,
} from "@/lib/matching/config";

// ── Helpers ──────────────────────────────────────────────────────

function bandFor(score: number, cfg: MatchingConfig): FitResult["band"] {
  if (score >= cfg.bands.high) return "high";
  if (score >= cfg.bands.medium) return "medium";
  return "low";
}

/**
 * Compute pgvector cosine *similarity* (1 - distance) between two
 * row sets. We use Prisma's $queryRaw because the embedding column
 * is `Unsupported("vector(384)")` and Prisma can't query it natively.
 *
 * Returns a list of (postingSkillId → { nearestUserSkillId, sim })
 * where sim is the cosine similarity to the nearest user-held skill
 * embedding. Posting skills the trainee already holds directly are
 * excluded — they're handled by directOverlap.
 */
async function nearestUserSkillPerPostingSkill(
  userId: string,
  postingId: string,
  excludeSkillIds: string[],
): Promise<
  Array<{
    postingSkillId: string;
    nearestUserSkillId: string;
    sim: number;
  }>
> {
  // Pgvector's <=> is cosine distance; similarity = 1 - distance.
  // For each posting skill not in the trainee's direct holdings,
  // find the closest user-held skill by embedding.
  //
  // Note: postgres can't take an empty array binding for `NOT IN`,
  // so we route empty-excludes through a sentinel that never matches.
  const exclude = excludeSkillIds.length > 0 ? excludeSkillIds : ["__none__"];

  const rows = await prisma.$queryRaw<
    Array<{
      posting_skill_id: string;
      nearest_user_skill_id: string;
      sim: number;
    }>
  >(Prisma.sql`
    WITH user_skills AS (
      SELECT s."id", s."embedding"
        FROM "UserSkill" us
        JOIN "Skill" s ON s."id" = us."skillId"
       WHERE us."userId" = ${userId}
         AND s."embedding" IS NOT NULL
    ),
    posting_skills AS (
      SELECT ps."skillId" AS posting_skill_id, s."embedding"
        FROM "PostingSkill" ps
        JOIN "Skill" s ON s."id" = ps."skillId"
       WHERE ps."postingId" = ${postingId}
         AND s."embedding" IS NOT NULL
         AND ps."skillId" NOT IN (${Prisma.join(exclude)})
    )
    SELECT ps.posting_skill_id,
           us."id"                                AS nearest_user_skill_id,
           1 - (ps."embedding" <=> us."embedding") AS sim
      FROM posting_skills ps
      CROSS JOIN LATERAL (
        SELECT us."id", us."embedding"
          FROM user_skills us
         ORDER BY ps."embedding" <=> us."embedding"
         LIMIT 1
      ) us
  `);

  return rows.map((r) => ({
    postingSkillId: r.posting_skill_id,
    nearestUserSkillId: r.nearest_user_skill_id,
    sim: Number(r.sim),
  }));
}

/**
 * Pathway-alignment: for each completed pathway, cosine similarity
 * between the pathway's embedding and the centroid of the posting's
 * skill embeddings. Returns rows above the alignment threshold.
 */
async function completedPathwayAlignment(
  userId: string,
  postingId: string,
  pathwayAlignMin: number,
): Promise<Array<{ pathwayId: string; title: string; sim: number }>> {
  const rows = await prisma.$queryRaw<
    Array<{ pathway_id: string; title: string; sim: number }>
  >(Prisma.sql`
    WITH posting_centroid AS (
      SELECT AVG(s."embedding")::vector(384) AS centroid
        FROM "PostingSkill" ps
        JOIN "Skill" s ON s."id" = ps."skillId"
       WHERE ps."postingId" = ${postingId}
         AND s."embedding" IS NOT NULL
    ),
    done_pathways AS (
      SELECT p."id" AS pathway_id, p."title", p."embedding"
        FROM "PathwayEnrollment" pe
        JOIN "Pathway" p ON p."id" = pe."pathwayId"
       WHERE pe."userId" = ${userId}
         AND pe."status" = 'completed'
         AND p."embedding" IS NOT NULL
    )
    SELECT dp.pathway_id, dp.title,
           1 - (dp."embedding" <=> pc.centroid) AS sim
      FROM done_pathways dp, posting_centroid pc
     WHERE pc.centroid IS NOT NULL
       AND 1 - (dp."embedding" <=> pc.centroid) >= ${pathwayAlignMin}
     ORDER BY sim DESC
     LIMIT 5
  `);

  return rows.map((r) => ({
    pathwayId: r.pathway_id,
    title: r.title,
    sim: Number(r.sim),
  }));
}

// ── Core scorer ──────────────────────────────────────────────────

/**
 * Compute a fit result for one (trainee, posting) pair.
 *
 * If the posting has no PostingSkill rows, we return a zeroed result
 * with a caveat — direct/semantic scoring is meaningless without
 * tagged skills. The UI shows "this posting hasn't been tagged yet"
 * rather than a misleading 0%.
 */
export async function scoreFitForTrainee(
  userId: string,
  postingId: string,
  /** Optional override — supply an in-memory config for the admin
   *  /admin/matching-config tester (preview impact without saving).
   *  When omitted, reads the persisted config; on any failure, falls
   *  back to DEFAULT_MATCHING_CONFIG. */
  overrideCfg?: MatchingConfig,
): Promise<FitResult> {
  const cfg = overrideCfg ?? (await getMatchingConfig().catch(() => DEFAULT_MATCHING_CONFIG));
  const W_DIRECT = cfg.weights.direct;
  const W_SEMANTIC = cfg.weights.semantic;
  const W_PATHWAY = cfg.weights.pathway;
  const PROFILE_CONFIDENCE_THRESHOLD = cfg.thresholds.profileCompleteness;
  const SEMANTIC_BRIDGE_MIN = cfg.thresholds.semanticBridgeMin;
  const REQUIRED_BONUS = cfg.thresholds.requiredSkillBonus;
  const PER_PATHWAY_BOOST = cfg.thresholds.perPathwayBoost;
  const MIN_POSTING_SKILLS = cfg.thresholds.minPostingSkillsForFullConfidence;

  const [userSkills, postingSkills, completedCount] = await Promise.all([
    prisma.userSkill.findMany({
      where: { userId },
      select: {
        skillId: true,
        level: true,
        skill: { select: { id: true, name: true } },
      },
    }),
    prisma.postingSkill.findMany({
      where: { postingId },
      select: {
        skillId: true,
        weight: true,
        required: true,
        skill: { select: { id: true, name: true } },
      },
    }),
    prisma.pathwayEnrollment.count({
      where: { userId, status: "completed" },
    }),
  ]);

  const caveats: string[] = [];
  if (postingSkills.length === 0) {
    caveats.push(
      "This posting hasn't been tagged with skills yet, so we can't compute a fit score. " +
        "Tagging happens via the admin skill-ontology tool — until then, judge by the description.",
    );
  }
  if (userSkills.length < PROFILE_CONFIDENCE_THRESHOLD) {
    caveats.push(
      `Your profile has only ${userSkills.length} skill${userSkills.length === 1 ? "" : "s"} on file — ` +
        `add ${PROFILE_CONFIDENCE_THRESHOLD - userSkills.length} more to lift the confidence of this score.`,
    );
  }

  if (postingSkills.length === 0 || userSkills.length === 0) {
    return {
      score: 0,
      band: "low",
      confidence: 0,
      subscores: {
        directOverlap: { score: 0, max: W_DIRECT },
        semanticSimilarity: { score: 0, max: W_SEMANTIC },
        pathwayAlignment: { score: 0, max: W_PATHWAY },
      },
      matched: [],
      missingRequired: postingSkills
        .filter((p) => p.required)
        .map((p) => ({ skillId: p.skillId, name: p.skill.name })),
      semanticBridges: [],
      pathwaysCounting: [],
      caveats: caveats.length > 0 ? caveats : ["Not enough data to score this match yet."],
      computedAt: new Date().toISOString(),
    };
  }

  // ── 1. Direct-overlap subscore (/50) ──────────────────────────
  const userLevel = new Map(userSkills.map((u) => [u.skillId, u.level]));
  const matched: FitResult["matched"] = [];
  const missingRequired: FitResult["missingRequired"] = [];

  let matchSum = 0;
  let weightSum = 0;
  for (const p of postingSkills) {
    const w = p.required ? p.weight + REQUIRED_BONUS : p.weight;
    weightSum += w;
    const lvl = userLevel.get(p.skillId);
    if (lvl !== undefined) {
      matchSum += w * lvl;
      matched.push({ skillId: p.skillId, name: p.skill.name, required: p.required });
    } else if (p.required) {
      missingRequired.push({ skillId: p.skillId, name: p.skill.name });
    }
  }
  const directOverlapNormalised = weightSum > 0 ? matchSum / weightSum : 0;
  const directOverlapScore = Math.round(directOverlapNormalised * W_DIRECT);

  // ── 2. Semantic-similarity subscore (/30) ──────────────────────
  const heldSkillIds = userSkills.map((u) => u.skillId);
  const semantic = await nearestUserSkillPerPostingSkill(userId, postingId, heldSkillIds);

  // Average the cosine sims over the posting skills the trainee
  // doesn't already hold. If they hold all of them, semantic ⇒ full.
  const semanticPool = semantic.length;
  const semanticAvg =
    semanticPool > 0
      ? semantic.reduce((acc, r) => acc + Math.max(0, r.sim), 0) / semanticPool
      : 1; // already held everything → max
  const semanticScore = Math.round(semanticAvg * W_SEMANTIC);

  // Build the "bridge" list — only sims above threshold, sorted desc.
  const userSkillNameById = new Map(userSkills.map((u) => [u.skillId, u.skill.name]));
  const postingSkillNameById = new Map(
    postingSkills.map((p) => [p.skillId, p.skill.name]),
  );
  const semanticBridges = semantic
    .filter((r) => r.sim >= SEMANTIC_BRIDGE_MIN)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)
    .map((r) => ({
      postingSkill: {
        id: r.postingSkillId,
        name: postingSkillNameById.get(r.postingSkillId) ?? "Unknown",
      },
      nearestUserSkill: {
        id: r.nearestUserSkillId,
        name: userSkillNameById.get(r.nearestUserSkillId) ?? "Unknown",
      },
      cosine: r.sim,
    }));

  // ── 3. Pathway-alignment subscore (/20) ────────────────────────
  let pathwayScore = 0;
  let pathwaysCounting: FitResult["pathwaysCounting"] = [];
  if (completedCount > 0) {
    const rows = await completedPathwayAlignment(userId, postingId, cfg.thresholds.pathwayAlignMin);
    pathwaysCounting = rows.map((r) => ({
      id: r.pathwayId,
      title: r.title,
      cosine: r.sim,
    }));
    // Each strongly-aligned completed pathway is worth up to 10 pts,
    // capped at the W_PATHWAY total.
    pathwayScore = Math.min(W_PATHWAY, pathwaysCounting.length * PER_PATHWAY_BOOST);
  } else {
    caveats.push(
      "You haven't completed any pathways yet — pathway completion contributes up to 20% of the fit score.",
    );
  }

  // ── Totals + confidence ────────────────────────────────────────
  const total = directOverlapScore + semanticScore + pathwayScore;
  const score = Math.max(0, Math.min(100, Math.round(total)));

  // Confidence — base 1.0, capped down by sparse profile.
  let confidence = 1.0;
  if (userSkills.length < PROFILE_CONFIDENCE_THRESHOLD) {
    confidence = Math.min(0.5, userSkills.length / PROFILE_CONFIDENCE_THRESHOLD);
  }
  // Soft penalty for postings tagged with very few skills (less signal).
  if (postingSkills.length < MIN_POSTING_SKILLS) {
    confidence = Math.min(confidence, 0.6);
    caveats.push(
      `This posting only lists ${postingSkills.length} required skill${postingSkills.length === 1 ? "" : "s"} — ` +
        "the fit signal is noisier than for a fully-tagged posting.",
    );
  }

  return {
    score,
    band: bandFor(score, cfg),
    confidence,
    subscores: {
      directOverlap: { score: directOverlapScore, max: W_DIRECT },
      semanticSimilarity: { score: semanticScore, max: W_SEMANTIC },
      pathwayAlignment: { score: pathwayScore, max: W_PATHWAY },
    },
    matched,
    missingRequired,
    semanticBridges,
    pathwaysCounting,
    caveats,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Convenience: rank every active posting for the given trainee.
 * Returns at most `limit` rows, sorted by score descending. Postings
 * with no tagged skills are excluded (we'd have nothing to score
 * against) but their existence is communicated separately in the
 * page hero.
 */
export async function rankPostingsForTrainee(
  userId: string,
  limit = 20,
): Promise<
  Array<{
    postingId: string;
    title: string;
    companyName: string;
    location: string | null;
    deadline: Date | null;
    fit: FitResult;
  }>
> {
  // Pull active postings that have at least one PostingSkill row.
  const postings = await prisma.internshipPosting.findMany({
    where: {
      status: "active",
      skills: { some: {} },
    },
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      deadline: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Fetch the config once outside the loop — scoreFitForTrainee would
  // otherwise hit the PlatformSetting table N times for the same row.
  const cfg = await getMatchingConfig().catch(() => DEFAULT_MATCHING_CONFIG);
  // Score serially — Phase 1 volumes are sub-200 postings × sub-50
  // skills. If volume grows, batch into a single SQL with window
  // functions (the directOverlap is straight SQL).
  const scored = await Promise.all(
    postings.map(async (p) => ({
      postingId: p.id,
      title: p.title,
      companyName: p.companyName,
      location: p.location,
      deadline: p.deadline,
      fit: await scoreFitForTrainee(userId, p.id, cfg),
    })),
  );

  return scored.sort((a, b) => b.fit.score - a.fit.score).slice(0, limit);
}

/**
 * Convenience: rank applicants for one posting, fit-sorted. Used by
 * the employer applicants page. `userIds` is the set already in the
 * pipeline — we don't surface arbitrary trainees, only those who've
 * applied (privacy + consent: an application IS the consent signal).
 */
export async function rankApplicantsForPosting(
  postingId: string,
  userIds: string[],
): Promise<Array<{ userId: string; fit: FitResult }>> {
  const cfg = await getMatchingConfig().catch(() => DEFAULT_MATCHING_CONFIG);
  const scored = await Promise.all(
    userIds.map(async (userId) => ({
      userId,
      fit: await scoreFitForTrainee(userId, postingId, cfg),
    })),
  );
  return scored.sort((a, b) => b.fit.score - a.fit.score);
}
