/**
 * AI tailoring — bullet-level + whole-resume rewrites.
 *
 * Two operations:
 *   rewriteBullet()  — single bullet → improved bullet, optionally
 *                      using a mentor's comment as guidance
 *   tailorToPosting() — every bullet across the resume → posting-
 *                      aligned variant, in one batched call
 *
 * Both run through callStructured() (the reliability wrapper over chat())
 * so the provider stack + AIInteraction logging + schema validation are
 * consistent with the rest of the AI surface. Every
 * rewrite returns the original alongside the suggestion so the
 * trainee can preview the diff before accepting — accepting is the
 * trainee's call, not the AI's.
 */
import { z } from "zod";
import { callStructured } from "@/lib/ai/reliability";
import type { ResumeContent } from "./types";

// ── Single-bullet rewrite ────────────────────────────────────────

const REWRITE_BULLET_SYSTEM = `You rewrite a single resume bullet point to be stronger.

PRINCIPLES:
- Lead with the action verb in past tense (e.g. "Built", "Led", "Cut").
- Quantify outcomes when the original mentions a number; never invent numbers.
- Surface the specific tool / technique / cell line / framework if the original mentions it.
- Keep it ONE sentence. Aim for 15–25 words.
- Plain professional English. No filler ("responsible for", "in charge of", "helped to").
- Preserve any [demo] prefix exactly as-is at the start, if present.

OUTPUT STRICTLY this JSON:
{ "rewritten": "the rewritten bullet" }

No prose, no markdown fences, no commentary outside the JSON.`;

/** Matches the lenient shape the old hand-parser read: `rewritten` is used
 *  only when it's a string, otherwise treated as absent → "". */
const RewriteBulletSchema = z.object({
  rewritten: z.string().optional(),
});

export async function rewriteBullet(args: {
  original: string;
  comment?: string;
  /** Optional context — job title + company the bullet sits under. */
  itemTitle?: string;
  itemSubtitle?: string;
  userId?: string | null;
}): Promise<{ ok: true; rewritten: string } | { ok: false; error: string }> {
  const lines: string[] = [];
  lines.push(`ORIGINAL BULLET:\n${args.original}`);
  if (args.itemTitle || args.itemSubtitle) {
    lines.push(
      `CONTEXT: ${args.itemTitle ?? ""}${args.itemTitle && args.itemSubtitle ? " — " : ""}${args.itemSubtitle ?? ""}`,
    );
  }
  if (args.comment) {
    lines.push(`MENTOR COMMENT (use this as guidance):\n${args.comment}`);
  } else {
    lines.push(`Improve the bullet using the principles above.`);
  }

  const r = await callStructured(
    [
      { role: "system", content: REWRITE_BULLET_SYSTEM },
      { role: "user",   content: lines.join("\n\n") },
    ],
    RewriteBulletSchema,
    { userId: args.userId, feature: "resume_rewrite_bullet", maxTokens: 256 },
  );
  if (!r.ok) {
    return { ok: false, error: "AI didn't return a usable rewrite." };
  }
  const rewritten = typeof r.data.rewritten === "string" ? r.data.rewritten.trim() : "";
  if (!rewritten) return { ok: false, error: "AI didn't return a usable rewrite." };
  return { ok: true, rewritten };
}

// ── Whole-resume tailoring ───────────────────────────────────────

const TAILOR_SYSTEM = `You tailor a resume to a specific job posting.

You receive:
  • POSTING — title, summary, required skills.
  • RESUME — an array of bullets. Each bullet has an ID, a context
    line ("Job title — Company"), and the bullet text itself.

For EVERY bullet in RESUME, produce ONE rewritten variant that:
  • Foregrounds the posting's required skills if the bullet plausibly
    touches them, using the exact skill name from the posting.
  • Stays truthful to what the original bullet claims — DON'T invent
    new facts, numbers, or experiences.
  • Stays in past tense, action-verb-first, 15–25 words.
  • Preserves any [demo] prefix exactly as-is.
  • Returns the bullet UNCHANGED if no improvement is obvious. Better
    to skip than to fabricate.

OUTPUT STRICTLY this JSON (one entry per input bullet):
{
  "rewrites": [
    { "id": "bullet-id-1", "rewritten": "..." },
    { "id": "bullet-id-2", "rewritten": "..." }
  ]
}

No prose, no markdown fences.`;

/** Mirrors the old tolerant parse: `rewrites` may be absent (→ []), and each
 *  entry is validated per-row in the loop below. Entries are typed `unknown`
 *  (not `object`) on purpose — the old hand-parser only gated on
 *  `Array.isArray(rewrites)` and then individually skipped any malformed row,
 *  so a mixed array (some junk, some valid) still yielded the valid rows. A
 *  stricter per-entry schema would reject the whole array on one bad row and
 *  drop the salvageable rewrites, changing results. */
const TailorResponseSchema = z.object({
  rewrites: z.array(z.unknown()).optional(),
});

export interface BulletForTailor {
  id: string;
  body: string;
  itemTitle?: string;
  itemSubtitle?: string;
}

export interface TailorRewrite {
  id: string;
  original: string;
  rewritten: string;
  /** True when the AI returned a meaningfully different string. */
  changed: boolean;
}

export async function tailorToPosting(args: {
  posting: { title: string; summary?: string | null; skills: string[] };
  bullets: BulletForTailor[];
  userId?: string | null;
}): Promise<{ ok: true; rewrites: TailorRewrite[] } | { ok: false; error: string }> {
  if (args.bullets.length === 0) {
    return { ok: true, rewrites: [] };
  }
  const postingLines: string[] = [];
  postingLines.push(`TITLE: ${args.posting.title}`);
  if (args.posting.summary) postingLines.push(`SUMMARY: ${args.posting.summary}`);
  if (args.posting.skills.length > 0) {
    postingLines.push(`REQUIRED SKILLS: ${args.posting.skills.join(", ")}`);
  }
  const bulletLines = args.bullets.map((b) => {
    const ctx = [b.itemTitle, b.itemSubtitle].filter(Boolean).join(" — ");
    return `  - id: ${b.id}\n    context: ${ctx || "(no context)"}\n    body: ${b.body}`;
  });

  const userPrompt =
    `POSTING:\n${postingLines.join("\n")}\n\n` +
    `RESUME (${args.bullets.length} bullets):\n${bulletLines.join("\n")}`;

  const r = await callStructured(
    [
      { role: "system", content: TAILOR_SYSTEM },
      { role: "user",   content: userPrompt },
    ],
    TailorResponseSchema,
    { userId: args.userId, feature: "resume_tailor", maxTokens: 4096 },
  );
  // The old hand-parser fell back to an empty rewrite list (→ ok:true, []) when
  // the response was missing/garbled, so unparseable output left the resume
  // untouched rather than erroring. Preserve that behavior here.
  const rewritesRaw: unknown[] = r.ok && Array.isArray(r.data.rewrites) ? r.data.rewrites : [];

  // Build lookup of originals so the result rows are self-contained
  // and the UI can render a diff without an extra round-trip.
  const origById = new Map(args.bullets.map((b) => [b.id, b.body]));
  const rewrites: TailorRewrite[] = [];
  for (const row of rewritesRaw) {
    const obj = row as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : null;
    const rewritten = typeof obj.rewritten === "string" ? obj.rewritten.trim() : "";
    if (!id || !rewritten) continue;
    const original = origById.get(id);
    if (original === undefined) continue;
    rewrites.push({
      id,
      original,
      rewritten,
      changed: rewritten.replace(/\s+/g, " ") !== original.replace(/\s+/g, " "),
    });
  }
  return { ok: true, rewrites };
}

// ── Tree walker helpers ──────────────────────────────────────────

/** Flatten ResumeContent → an array of bullets with their item context.
 *  Used by both the tailor endpoint (collect prompt input) and the
 *  client-side patcher (apply rewrites by bullet id). */
export function flattenBullets(content: ResumeContent): BulletForTailor[] {
  const out: BulletForTailor[] = [];
  for (const sec of content.sections) {
    for (const it of sec.items) {
      for (const b of it.bullets) {
        out.push({
          id: b.id,
          body: b.body,
          itemTitle: it.title,
          itemSubtitle: it.subtitle,
        });
      }
    }
  }
  return out;
}

/** Mutate-in-place clone: apply a map of bullet-id → rewritten text. */
export function applyBulletRewrites(
  content: ResumeContent,
  rewrites: Record<string, string>,
): ResumeContent {
  // Deep clone so callers can compare before/after for diff UI.
  const cloned: ResumeContent = JSON.parse(JSON.stringify(content));
  for (const sec of cloned.sections) {
    for (const it of sec.items) {
      for (const b of it.bullets) {
        const next = rewrites[b.id];
        if (next && next !== b.body) {
          b.body = next;
          b.aiSuggested = true;
        }
      }
    }
  }
  return cloned;
}
