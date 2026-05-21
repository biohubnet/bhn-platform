/**
 * Master → tailored-resume AI flow.
 *
 * Three-stage pipeline shared by the preview endpoint and any future
 * batch / scheduled invocations:
 *
 *   1. resolveJdText      — turn (postingId? jobDescription?) into a
 *                            single string that represents the role.
 *   2. shortlistByCosine  — embed the JD, cosine-search the caller's
 *                            non-archived MasterBullets, take top N.
 *   3. pickAndRewrite     — feed JD + shortlist to the LLM; ask for
 *                            JSON with `picked`, `rewrites`, `reasons`.
 *
 * The "AI is a librarian, not an author" principle from
 * docs/plans/master-resume.md is enforced in the system prompt — the
 * model is told it must NOT invent bullets, must NOT introduce facts
 * not present in the original, and must keep rewrites light.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral, chat, AI_CONFIGURED } from "@/lib/ai";

/** Maximum bullets returned in the final pick. The plan picks 12 by
 *  default; we cap higher so callers can request "up to" 20 for power
 *  users without code change. The LLM tends to pick fewer than the
 *  cap when the JD only matches a handful of bullets. */
export const HARD_BULLET_CAP = 20;

/** How many bullets we cosine-shortlist before LLM re-rank. The plan
 *  says 30 — large enough to give the LLM real choice without
 *  blowing the context budget. */
export const COSINE_SHORTLIST = 30;

export interface ResolvedJd {
  /** The full JD text used for embedding + LLM prompt. */
  text: string;
  /** Short label for the role used in the UI ("Sanofi · Upstream Scientist II"). */
  label: string;
  /** When the JD came from a posting row, surface its skills so the
   *  LLM can foreground them. Empty for free-text JDs. */
  postingSkills: string[];
}

export async function resolveJdText(args: {
  postingId?: string | null;
  jobDescription?: string | null;
}): Promise<ResolvedJd | { error: string }> {
  if (args.postingId) {
    const posting = await prisma.internshipPosting.findUnique({
      where: { id: args.postingId },
      select: {
        title: true, companyName: true, location: true,
        positionDetails: true, keySkills: true,
        skills: { select: { skill: { select: { name: true } } }, take: 30 },
      },
    });
    if (!posting) return { error: "Posting not found." };
    const skillNames = Array.from(new Set([
      ...(posting.keySkills ?? []),
      ...posting.skills.map((s) => s.skill.name),
    ])).filter(Boolean);
    const parts: string[] = [];
    parts.push(`ROLE: ${posting.title}`);
    parts.push(`COMPANY: ${posting.companyName}`);
    if (posting.location) parts.push(`LOCATION: ${posting.location}`);
    if (skillNames.length > 0) parts.push(`KEY SKILLS: ${skillNames.join(", ")}`);
    parts.push(`\nDETAILS:\n${posting.positionDetails ?? ""}`);
    return {
      text: parts.join("\n").trim(),
      label: `${posting.companyName} · ${posting.title}`,
      postingSkills: skillNames,
    };
  }
  const raw = (args.jobDescription ?? "").trim();
  if (!raw) return { error: "Provide a postingId or jobDescription." };
  if (raw.length < 40) {
    return { error: "Job description is too short — paste at least a paragraph so the AI has something to work with." };
  }
  return {
    text: raw,
    label: "Pasted job description",
    postingSkills: [],
  };
}

export interface ShortlistRow {
  id: string;
  body: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  similarity: number;
  tags: string[];
}

/** Embed the JD + cosine-rank the user's non-archived master bullets.
 *  Returns top N bullets sorted by similarity descending. Falls back
 *  to a recency-ordered list if embeddings aren't yet available for
 *  the caller's bullets — better to give the LLM something than to
 *  hard-fail. */
export async function shortlistByCosine(args: {
  masterId: string;
  jdText: string;
  userId: string;
  limit?: number;
}): Promise<{ rows: ShortlistRow[]; mode: "semantic" | "recency"; jdEmbedded: boolean }> {
  const limit = Math.min(args.limit ?? COSINE_SHORTLIST, 60);

  // Embed the JD. If embedding is misconfigured we still want to run
  // the LLM pass on a recency-ordered shortlist rather than fail
  // the whole flow — the cosine pre-filter is an optimisation, not
  // a correctness guarantee.
  let jdVector: number[] | null = null;
  if (AI_CONFIGURED.embed) {
    const vectors = await embed([args.jdText], {
      feature: "master_tailor_jd",
      userId: args.userId,
    });
    jdVector = vectors?.[0] ?? null;
  }

  if (jdVector) {
    const rows = await prisma.$queryRaw<Array<{
      id: string; body: string; sectionKind: string;
      anchorTitle: string | null; anchorSubtitle: string | null;
      similarity: number; tags: string[];
    }>>(Prisma.sql`
      SELECT "id", "body", "sectionKind",
             "anchorTitle", "anchorSubtitle", "tags",
             1 - ("embedding" <=> ${toVectorLiteral(jdVector)}::vector) AS "similarity"
        FROM "MasterBullet"
       WHERE "masterId" = ${args.masterId}
         AND "isArchived" = false
         AND "embedding" IS NOT NULL
       ORDER BY "embedding" <=> ${toVectorLiteral(jdVector)}::vector
       LIMIT ${limit}
    `);
    if (rows.length > 0) {
      return {
        rows: rows.map((r) => ({ ...r, similarity: Number(r.similarity) })),
        mode: "semantic",
        jdEmbedded: true,
      };
    }
  }

  // No embeddings exist yet — fall back to most-recent bullets,
  // capped at the same limit. Better than empty so the LLM can still
  // pick from something representative.
  const recent = await prisma.masterBullet.findMany({
    where: { masterId: args.masterId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, body: true, sectionKind: true,
      anchorTitle: true, anchorSubtitle: true, tags: true,
    },
    take: limit,
  });
  return {
    rows: recent.map((r) => ({ ...r, similarity: 0 })),
    mode: "recency",
    jdEmbedded: !!jdVector,
  };
}

const PICK_AND_REWRITE_SYSTEM = `You are a resume librarian helping a candidate tailor their existing resume bullets to a job description.

THE FIVE RULES (non-negotiable):
1. You ONLY pick from the bullets the user already has. DO NOT invent new bullets.
2. You DO NOT add facts, numbers, tools, or experiences that are not already in the candidate's bullet text.
3. Rewrites are LIGHT — adjust vocabulary to match the JD (e.g. if the JD says "mammalian cell culture", and the bullet says "cell culture", you may upgrade it). Never change the underlying claim.
4. Pick AT MOST the requested number of bullets. Fewer is fine if only fewer are relevant.
5. Each picked bullet must have a concrete reason rooted in the JD ("matches the bioreactor sampling requirement", not "great bullet").

You will receive:
  • JOB DESCRIPTION — title, company, key skills, full body.
  • LIBRARY — a numbered list of the candidate's bullets. Each line has bullet_id, section, anchor (job title + company), and body.

You must return STRICT JSON in this shape — NO prose, NO markdown fences, NO commentary:

{
  "picked": ["bullet_id_a", "bullet_id_b", ...],
  "rewrites": {
    "bullet_id_a": "rewritten bullet text — may equal original if no change needed",
    "bullet_id_b": "..."
  },
  "reasons": {
    "bullet_id_a": "≤20 word reason grounded in JD vocabulary",
    "bullet_id_b": "..."
  }
}

The keys of \`rewrites\` and \`reasons\` MUST be a subset of \`picked\`. If you cannot improve a bullet, copy the original text verbatim into \`rewrites\`.`;

export interface AiSuggestion {
  bulletId: string;
  originalBody: string;
  rewrittenBody: string;
  reason: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  similarity: number;
}

/** Drive the LLM pick + light rewrite step. Returns null on parse
 *  failure — caller decides how to surface "AI didn't return usable
 *  JSON" (preview endpoint returns a 502 with the raw text trimmed). */
export async function pickAndRewrite(args: {
  jd: ResolvedJd;
  shortlist: ShortlistRow[];
  maxBullets: number;
  userId: string;
}): Promise<{ ok: true; suggestions: AiSuggestion[] } | { ok: false; error: string }> {
  if (args.shortlist.length === 0) {
    return { ok: false, error: "No bullets in your library to pick from — add some on /profile/master first." };
  }

  // Build the LIBRARY block. We index each row 1..N so the LLM has a
  // stable handle even if a bullet_id is long; we ask for ids in the
  // output, not row numbers — those are just visual scaffolding.
  const libraryLines = args.shortlist.map((b, i) => {
    const anchor = [b.anchorTitle, b.anchorSubtitle].filter(Boolean).join(" — ") || "(no anchor)";
    return `  ${i + 1}. bullet_id=${b.id} | section=${b.sectionKind} | anchor=${anchor}\n     body: ${b.body}`;
  });

  const jdBlock = [
    `JOB DESCRIPTION:`,
    `  Label: ${args.jd.label}`,
    args.jd.postingSkills.length > 0 ? `  Key skills: ${args.jd.postingSkills.join(", ")}` : null,
    ``,
    args.jd.text,
  ].filter(Boolean).join("\n");

  const userPrompt = [
    jdBlock,
    ``,
    `LIBRARY (${args.shortlist.length} bullets — pick at most ${args.maxBullets}):`,
    ...libraryLines,
    ``,
    `Remember: pick at most ${args.maxBullets}. Return STRICT JSON only.`,
  ].join("\n");

  const result = await chat(
    [
      { role: "system", content: PICK_AND_REWRITE_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    {
      userId: args.userId,
      feature: "master_tailor_pick",
      maxTokens: 2048,
      temperature: 0.3,
    },
  );
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.text) return { ok: false, error: "AI returned an empty response." };

  const parsed = extractJson(result.text) as
    | { picked?: unknown; rewrites?: unknown; reasons?: unknown }
    | null;
  if (!parsed || !Array.isArray(parsed.picked)) {
    return { ok: false, error: "AI didn't return parseable JSON. Try again." };
  }
  const pickedIds = parsed.picked
    .filter((x): x is string => typeof x === "string")
    .slice(0, Math.min(args.maxBullets, HARD_BULLET_CAP));
  const rewrites = (parsed.rewrites && typeof parsed.rewrites === "object")
    ? parsed.rewrites as Record<string, unknown>
    : {};
  const reasons = (parsed.reasons && typeof parsed.reasons === "object")
    ? parsed.reasons as Record<string, unknown>
    : {};

  const byId = new Map(args.shortlist.map((b) => [b.id, b]));
  const suggestions: AiSuggestion[] = [];
  for (const id of pickedIds) {
    const row = byId.get(id);
    if (!row) continue; // LLM hallucinated an id — skip silently
    const rewrittenRaw = typeof rewrites[id] === "string" ? (rewrites[id] as string).trim() : "";
    const reasonRaw = typeof reasons[id] === "string" ? (reasons[id] as string).trim() : "";
    suggestions.push({
      bulletId: row.id,
      originalBody: row.body,
      rewrittenBody: rewrittenRaw || row.body,
      reason: reasonRaw || "Relevant to the role.",
      sectionKind: row.sectionKind,
      anchorTitle: row.anchorTitle,
      anchorSubtitle: row.anchorSubtitle,
      similarity: row.similarity,
    });
  }

  return { ok: true, suggestions };
}

/** Same tolerant JSON extractor used in resume/tailor.ts + resume/parse.ts. */
function extractJson(raw: string): unknown | null {
  let body = raw.trim();
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first < 0 || last < 0 || last < first) return null;
  body = body.slice(first, last + 1);
  try { return JSON.parse(body); } catch { return null; }
}
