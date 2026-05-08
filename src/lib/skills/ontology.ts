/**
 * Skill ontology toolkit. Surface area:
 *
 *   ensureSkillSeed()             — idempotent seed of starter skills
 *   resolveAlias(text)            — match a free-text fragment to a Skill
 *   findSimilarSkills(text, k)    — pgvector-backed nearest neighbours
 *   extractSkillsFromText(text)   — AI-driven extraction returning Skill IDs
 *   embedSkill(id)                — compute and persist the BGE embedding
 *   mergeSkills(loserId, winnerId) — admin merge: re-point alias rows + tags
 *
 * The extractor is the workhorse. It takes a blob of text (course
 * description, posting body, resume paragraph) and returns:
 *
 *   { existing: [{ skillId, confidence }], new: [{ name, confidence }] }
 *
 * "existing" rows are immediately writable as CourseSkill / PostingSkill /
 * UserSkill. "new" rows go through the admin review queue at /admin/skills.
 */
import { prisma } from "@/lib/prisma";
import { embed, chat } from "@/lib/ai";
import { SKILL_SEED } from "./seed";

// ── Slug helpers ─────────────────────────────────────────────────
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normaliseAlias(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Seed ─────────────────────────────────────────────────────────
let seedRan = false;
export async function ensureSkillSeed(): Promise<{ created: number; existing: number }> {
  if (seedRan) return { created: 0, existing: 0 };
  let created = 0;
  let existing = 0;
  for (const s of SKILL_SEED) {
    const slug = slugify(s.name);
    const found = await prisma.skill.findUnique({ where: { slug } });
    if (found) { existing++; continue; }
    const skill = await prisma.skill.create({
      data: {
        name: s.name,
        slug,
        category: s.category,
        description: s.description ?? null,
        status: "active",
      },
    });
    // Aliases: include the canonical name lowercased so plain string
    // matches resolve before AI even gets called.
    const aliases = new Set<string>();
    aliases.add(normaliseAlias(s.name));
    for (const a of s.aliases ?? []) aliases.add(normaliseAlias(a));
    for (const alias of aliases) {
      try {
        await prisma.skillAlias.create({ data: { skillId: skill.id, alias } });
      } catch {/* duplicate alias on collision — just skip */}
    }
    created++;
  }
  seedRan = true;
  return { created, existing };
}

// ── Embedding ────────────────────────────────────────────────────
export async function embedSkill(skillId: string) {
  const s = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { name: true, category: true, description: true, aliases: { select: { alias: true } } },
  });
  if (!s) return false;
  // Concatenate canonical + aliases + description so the embedding
  // captures synonym space, not just the canonical name.
  const text = [
    s.name,
    s.category ?? "",
    s.description ?? "",
    ...(s.aliases?.map((a) => a.alias) ?? []),
  ].filter(Boolean).join(" · ");
  const vecs = await embed([text], { feature: "skill_embedding" });
  if (!vecs || !vecs[0]) return false;
  // pgvector accepts the JSON-array literal — wrap it in a string cast.
  const literal = "[" + vecs[0].join(",") + "]";
  await prisma.$executeRawUnsafe(
    `UPDATE "Skill" SET "embedding" = $1::vector, "updatedAt" = NOW() WHERE "id" = $2`,
    literal,
    skillId,
  );
  return true;
}

/** Best-effort embed for any Skill without one. Bounded so the call
 *  doesn't run away on a giant ontology. */
export async function embedMissingSkills(limit = 25): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Skill" WHERE "embedding" IS NULL AND "status" = 'active' LIMIT ${limit}`,
  );
  let done = 0;
  for (const r of rows) {
    if (await embedSkill(r.id)) done++;
  }
  return done;
}

// ── Resolve / find ───────────────────────────────────────────────
export async function resolveAlias(text: string): Promise<{ id: string; name: string } | null> {
  const norm = normaliseAlias(text);
  if (!norm) return null;
  const hit = await prisma.skillAlias.findUnique({
    where: { alias: norm },
    include: { skill: { select: { id: true, name: true, status: true, mergedIntoId: true } } },
  });
  if (!hit) return null;
  // Follow merges to the surviving canonical Skill.
  let id = hit.skillId;
  let name = hit.skill.name;
  if (hit.skill.status === "merged" && hit.skill.mergedIntoId) {
    const winner = await prisma.skill.findUnique({
      where: { id: hit.skill.mergedIntoId },
      select: { id: true, name: true },
    });
    if (winner) { id = winner.id; name = winner.name; }
  }
  return { id, name };
}

export async function findSimilarSkills(
  text: string,
  k = 5,
): Promise<{ id: string; name: string; similarity: number }[]> {
  const vecs = await embed([text], { feature: "skill_search" });
  if (!vecs || !vecs[0]) return [];
  const literal = "[" + vecs[0].join(",") + "]";
  // <=> is cosine distance in pgvector; lower = more similar. We
  // convert to similarity (1 - distance) for caller convenience.
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; distance: number }[]>(
    `SELECT "id", "name", "embedding" <=> $1::vector AS distance
       FROM "Skill"
      WHERE "status" = 'active' AND "embedding" IS NOT NULL
      ORDER BY distance
      LIMIT ${k}`,
    literal,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, similarity: 1 - Number(r.distance) }));
}

// ── AI extraction ────────────────────────────────────────────────
export interface ExtractionResult {
  existing: { skillId: string; name: string; confidence: number }[];
  novel:    { name: string; confidence: number }[];
}

const EXTRACTION_SYSTEM = `You extract skill labels from biomanufacturing / life-sciences text.

Output strict JSON with the shape:
{ "skills": [ "Skill name", ... ] }

Rules:
• Return 3–10 distinct skill names. Skip if the text is too short.
• Prefer canonical industry vocabulary: GMP, HPLC, Cell Culture, USP, DSP, etc.
• Use the official BHN skill list when an entry obviously fits — but you may also propose new ones if a real skill is mentioned that's not in the list.
• Each name should be Title Case, ≤ 60 chars.
• Never include things that aren't skills (company names, people, soft phrases like "team player").
• Reply with ONLY valid JSON. No prose, no code fences.`;

export async function extractSkillsFromText(text: string): Promise<ExtractionResult> {
  const trimmed = text.trim();
  if (trimmed.length < 30) return { existing: [], novel: [] };

  // Show the model the active canonical names so it leans towards them
  const knownSkills = await prisma.skill.findMany({
    where: { status: "active" },
    select: { name: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  const knownNames = knownSkills.map((s) => s.name).join(", ");

  const userMsg = `Known canonical skills (prefer these when applicable):\n${knownNames}\n\n---\nExtract skills from this text:\n\n${trimmed.slice(0, 4000)}`;

  const r = await chat(
    [
      { role: "system", content: EXTRACTION_SYSTEM },
      { role: "user", content: userMsg },
    ],
    { feature: "skill_extraction", maxTokens: 400, temperature: 0.2 },
  );
  if (!r.ok) return { existing: [], novel: [] };

  // Parse JSON, tolerant of stray code fences or pre/post text.
  let parsed: { skills?: unknown } = {};
  try {
    const json = extractJsonObject(r.text);
    parsed = json ? (JSON.parse(json) as { skills?: unknown }) : {};
  } catch { return { existing: [], novel: [] }; }
  const candidates = Array.isArray(parsed.skills) ? parsed.skills.filter((s): s is string => typeof s === "string") : [];

  const existing: ExtractionResult["existing"] = [];
  const novel: ExtractionResult["novel"] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const norm = normaliseAlias(c);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);

    // 1. exact alias hit
    const aliasHit = await resolveAlias(c);
    if (aliasHit) {
      existing.push({ skillId: aliasHit.id, name: aliasHit.name, confidence: 0.95 });
      continue;
    }
    // 2. embedding nearest neighbour above threshold
    const sim = await findSimilarSkills(c, 1);
    if (sim[0] && sim[0].similarity > 0.78) {
      existing.push({ skillId: sim[0].id, name: sim[0].name, confidence: sim[0].similarity });
      continue;
    }
    // 3. genuinely new — admin will review
    novel.push({ name: c.trim(), confidence: 0.6 });
  }
  return { existing, novel };
}

/** Tolerant balanced-brace JSON walker — same pattern as forms parser. */
function extractJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0; let inStr = false; let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

// ── Tagging entrypoints ──────────────────────────────────────────
export async function tagCourse(courseId: string, text: string) {
  const { existing, novel } = await extractSkillsFromText(text);
  for (const e of existing) {
    await prisma.courseSkill.upsert({
      where: { courseId_skillId: { courseId, skillId: e.skillId } },
      create: { courseId, skillId: e.skillId, source: "ai", confidence: e.confidence, weight: 0.6 },
      update: { confidence: e.confidence, source: "ai" },
    });
  }
  await stashNovel(novel, "course", courseId);
  return { tagged: existing.length, queued: novel.length };
}

export async function tagPosting(postingId: string, text: string) {
  const { existing, novel } = await extractSkillsFromText(text);
  for (const e of existing) {
    await prisma.postingSkill.upsert({
      where: { postingId_skillId: { postingId, skillId: e.skillId } },
      create: { postingId, skillId: e.skillId, source: "ai", confidence: e.confidence, weight: 0.7, required: e.confidence >= 0.9 },
      update: { confidence: e.confidence, source: "ai" },
    });
  }
  await stashNovel(novel, "posting", postingId);
  return { tagged: existing.length, queued: novel.length };
}

export async function tagUser(userId: string, text: string, source: "resume" | "ai" = "ai", evidence?: Record<string, unknown>) {
  const { existing, novel } = await extractSkillsFromText(text);
  for (const e of existing) {
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: e.skillId } },
      create: {
        userId,
        skillId: e.skillId,
        source,
        level: e.confidence >= 0.9 ? 0.7 : 0.5,
        evidence: evidence ? (evidence as object) : undefined,
      },
      update: {
        // Don't overwrite a stronger signal (self-claim or admin) with AI
        source: source === "resume" ? "resume" : undefined,
      },
    });
  }
  await stashNovel(novel, "user", userId);
  return { tagged: existing.length, queued: novel.length };
}

/**
 * Course completion → infer UserSkills from CourseSkills.
 * Idempotent — re-running for the same enrollment doesn't duplicate.
 */
export async function inferSkillsFromCompletion(userId: string, courseId: string) {
  const courseSkills = await prisma.courseSkill.findMany({
    where: { courseId },
    select: { skillId: true, weight: true },
  });
  let added = 0;
  for (const cs of courseSkills) {
    try {
      const existing = await prisma.userSkill.findUnique({
        where: { userId_skillId: { userId, skillId: cs.skillId } },
      });
      if (existing) {
        // Append the courseId to evidence and bump level if it's still inferred.
        const ev = (existing.evidence as { courseIds?: string[] } | null) ?? {};
        const ids = new Set([...(ev.courseIds ?? []), courseId]);
        await prisma.userSkill.update({
          where: { userId_skillId: { userId, skillId: cs.skillId } },
          data: {
            evidence: { ...ev, courseIds: Array.from(ids) },
            level: existing.source === "inferred"
              ? Math.min(0.85, existing.level + 0.1)
              : existing.level,
          },
        });
      } else {
        await prisma.userSkill.create({
          data: {
            userId,
            skillId: cs.skillId,
            source: "inferred",
            level: 0.5 + Math.min(0.3, cs.weight * 0.5),
            evidence: { courseIds: [courseId] },
          },
        });
        added++;
      }
    } catch {/* race / constraint — skip */}
  }
  return added;
}

// Novel candidates land in a tiny pseudo-table inside Skill: we create
// the row with status="merged" + alias entry pointing at it so the
// admin sees them at /admin/skills, can rename / merge / approve.
async function stashNovel(novel: { name: string }[], sourceType: string, sourceId: string) {
  for (const n of novel) {
    const slug = slugify(n.name);
    if (!slug) continue;
    try {
      await prisma.skill.upsert({
        where: { slug },
        create: {
          name: n.name,
          slug,
          status: "review",
          description: `Proposed from ${sourceType} ${sourceId}`,
        },
        update: {},
      });
    } catch {/* race */}
  }
}

// ── Admin merge ──────────────────────────────────────────────────
export async function mergeSkills(loserId: string, winnerId: string): Promise<boolean> {
  if (loserId === winnerId) return false;
  await prisma.$transaction(async (tx) => {
    // Re-point all tags. CourseSkill / UserSkill / PostingSkill have a
    // unique on (parent, skillId) so swap with safety.
    await tx.$executeRaw`
      UPDATE "CourseSkill" SET "skillId" = ${winnerId}
       WHERE "skillId" = ${loserId}
         AND "courseId" NOT IN (SELECT "courseId" FROM "CourseSkill" WHERE "skillId" = ${winnerId})`;
    await tx.$executeRaw`DELETE FROM "CourseSkill" WHERE "skillId" = ${loserId}`;

    await tx.$executeRaw`
      UPDATE "UserSkill" SET "skillId" = ${winnerId}
       WHERE "skillId" = ${loserId}
         AND "userId" NOT IN (SELECT "userId" FROM "UserSkill" WHERE "skillId" = ${winnerId})`;
    await tx.$executeRaw`DELETE FROM "UserSkill" WHERE "skillId" = ${loserId}`;

    await tx.$executeRaw`
      UPDATE "PostingSkill" SET "skillId" = ${winnerId}
       WHERE "skillId" = ${loserId}
         AND "postingId" NOT IN (SELECT "postingId" FROM "PostingSkill" WHERE "skillId" = ${winnerId})`;
    await tx.$executeRaw`DELETE FROM "PostingSkill" WHERE "skillId" = ${loserId}`;

    // Move the loser's aliases to the winner. Aliases are globally
    // unique, so re-pointing is safe as long as the winner doesn't
    // already own them.
    await tx.$executeRaw`
      UPDATE "SkillAlias" SET "skillId" = ${winnerId}
       WHERE "skillId" = ${loserId}
         AND "alias" NOT IN (SELECT "alias" FROM "SkillAlias" WHERE "skillId" = ${winnerId})`;
    await tx.$executeRaw`DELETE FROM "SkillAlias" WHERE "skillId" = ${loserId}`;

    await tx.skill.update({
      where: { id: loserId },
      data: { status: "merged", mergedIntoId: winnerId },
    });
  });
  return true;
}

// ── Cosine similarity over UserSkill ↔ PostingSkill (in-app) ────
/** Compute a 0..100 match score between a user's skills and a posting's. */
export function scoreMatch(
  userSkills: { skillId: string; level: number }[],
  postingSkills: { skillId: string; weight: number; required: boolean }[],
): { score: number; matched: number; missingRequired: string[] } {
  if (postingSkills.length === 0) return { score: 0, matched: 0, missingRequired: [] };
  const userMap = new Map(userSkills.map((u) => [u.skillId, u.level]));
  let matchSum = 0;
  let weightSum = 0;
  let matched = 0;
  const missingRequired: string[] = [];
  for (const p of postingSkills) {
    const w = p.required ? p.weight + 0.5 : p.weight;
    weightSum += w;
    const lvl = userMap.get(p.skillId);
    if (lvl !== undefined) {
      matchSum += w * lvl;
      matched++;
    } else if (p.required) {
      missingRequired.push(p.skillId);
    }
  }
  const score = weightSum > 0 ? Math.round((matchSum / weightSum) * 100) : 0;
  return { score, matched, missingRequired };
}
