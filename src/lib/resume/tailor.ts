/**
 * AI tailoring — bullet-level + whole-resume rewrites.
 *
 * Two operations:
 *   rewriteBullet()  — single bullet → improved bullet, optionally
 *                      using a mentor's comment as guidance
 *   tailorToPosting() — every bullet across the resume → posting-
 *                      aligned variant, in one batched call
 *
 * Both run through the same `chat()` adapter that powers parse() so
 * the provider stack + AIInteraction logging is consistent. Every
 * rewrite returns the original alongside the suggestion so the
 * trainee can preview the diff before accepting — accepting is the
 * trainee's call, not the AI's.
 */
import { chat } from "@/lib/ai";
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

  const result = await chat(
    [
      { role: "system", content: REWRITE_BULLET_SYSTEM },
      { role: "user",   content: lines.join("\n\n") },
    ],
    { userId: args.userId, feature: "resume_rewrite_bullet", maxTokens: 256 },
  );
  if (!result.ok || !result.text) {
    return { ok: false, error: result.ok ? "Empty AI response." : result.error };
  }
  const json = extractJson(result.text);
  const rewritten = json && typeof (json as Record<string, unknown>).rewritten === "string"
    ? ((json as Record<string, unknown>).rewritten as string).trim()
    : "";
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

  const result = await chat(
    [
      { role: "system", content: TAILOR_SYSTEM },
      { role: "user",   content: userPrompt },
    ],
    { userId: args.userId, feature: "resume_tailor", maxTokens: 4096 },
  );
  if (!result.ok || !result.text) {
    return { ok: false, error: result.ok ? "Empty AI response." : result.error };
  }
  const json = extractJson(result.text);
  const rewritesRaw = json && Array.isArray((json as Record<string, unknown>).rewrites)
    ? ((json as Record<string, unknown>).rewrites as unknown[])
    : [];

  // Build lookup of originals so the result rows are self-contained
  // and the UI can render a diff without an extra round-trip.
  const origById = new Map(args.bullets.map((b) => [b.id, b.body]));
  const rewrites: TailorRewrite[] = [];
  for (const r of rewritesRaw) {
    const obj = r as Record<string, unknown>;
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

/** Same tolerant JSON extractor used in resume/parse.ts. */
function extractJson(raw: string): unknown | null {
  let body = raw.trim();
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const first = body.indexOf("{");
  const last  = body.lastIndexOf("}");
  if (first < 0 || last < 0 || last < first) return null;
  body = body.slice(first, last + 1);
  try { return JSON.parse(body); } catch { return null; }
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
