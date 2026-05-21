/**
 * Resume linter — flags grammar / spelling / style issues the same
 * way a code linter flags unused variables or weak types. AI-powered:
 * the structured resume is serialised, walked, and shipped to the
 * platform's chat() adapter with a system prompt that asks for a
 * JSON-structured list of issues anchored back to the field they
 * came from.
 *
 * Each issue lives at one of these levels (most-specific to most-
 * general):
 *   • bullet (anchorBulletId)        — a single bullet line
 *   • item   (anchorItemId)          — an experience/education row
 *   • section (anchorSectionId)      — a section description
 *   • header.<field>                 — header.summary / name / etc.
 *
 * The UI shows each issue with its category, severity, message, and
 * (optionally) a suggested replacement. "Apply fix" updates the
 * relevant content node in place.
 */
import type { ResumeContent } from "@/lib/resume/types";

export type LintSeverity = "info" | "warn" | "error";

export type LintCategory =
  | "spelling"
  | "grammar"
  | "weak-verb"
  | "passive-voice"
  | "vague"
  | "tense"
  | "missing-metric"
  | "repetition"
  | "first-person"
  | "wordiness"
  | "style";

export interface LintIssue {
  /** Random short id — used as React key + apply tracking. */
  id: string;
  severity: LintSeverity;
  category: LintCategory;
  /** Short one-line explanation of what's wrong. */
  message: string;
  /** Optional replacement text. When present, UI surfaces an
   *  "Apply fix" button that overwrites the anchored field. */
  suggestion?: string;
  /** The excerpt the issue applies to. For bullets / descriptions
   *  with a suggestion, this matches the original field text. For
   *  items / sections without a suggestion, it's a quoted phrase
   *  from inside the field. */
  excerpt?: string;

  // Anchors. Exactly one of these is set per issue.
  anchorBulletId?: string;
  anchorItemId?: string;
  anchorSectionId?: string;
  anchorHeaderField?: "summary" | "name" | "email" | "phone" | "location";
}

/** Category metadata — label, glyph, default severity, short blurb.
 *  Lives next to the type so the UI can render category chips
 *  without each consumer hand-rolling a mapping. */
export const LINT_CATEGORY_META: Record<LintCategory, { label: string; blurb: string }> = {
  spelling:        { label: "Spelling",        blurb: "Likely typo or misspelled word." },
  grammar:         { label: "Grammar",         blurb: "Subject-verb, article, preposition, or punctuation issue." },
  "weak-verb":     { label: "Weak verb",       blurb: "Vague verb like 'worked on' or 'helped with'. Replace with a stronger action verb." },
  "passive-voice": { label: "Passive voice",   blurb: "Passive construction. Rewrite to lead with what you did." },
  vague:           { label: "Vague",           blurb: "Filler phrase like 'various tasks', 'different things'. Be specific." },
  tense:           { label: "Tense",           blurb: "Mixed past/present tense within a section. Pick one." },
  "missing-metric": { label: "Missing metric", blurb: "Bullet has no number, percentage, or quantified result. Adding one makes it land harder." },
  repetition:      { label: "Repetition",      blurb: "Same action verb used in multiple bullets. Vary your openers." },
  "first-person":  { label: "First person",    blurb: "Resume bullets typically drop 'I'. Strip it for tighter copy." },
  wordiness:       { label: "Wordy",           blurb: "Tighten by removing filler words." },
  style:           { label: "Style",           blurb: "Stylistic suggestion." },
};

/** Build the system + user messages for the linter. The system
 *  prompt sets the rule book; the user message ships the resume as
 *  JSON with each text-bearing node carrying its node id so the AI
 *  can anchor issues back. */
export function buildLintPrompt(content: ResumeContent): { system: string; user: string } {
  const system = `You are a sharp, kind resume editor. You review structured resumes for the issues a strong career mentor would catch on a first pass.

You ONLY return valid JSON — an array of issue objects. No prose, no markdown fence, just the JSON array.

Each issue has this shape:
{
  "category": "spelling" | "grammar" | "weak-verb" | "passive-voice" | "vague" | "tense" | "missing-metric" | "repetition" | "first-person" | "wordiness" | "style",
  "severity": "info" | "warn" | "error",
  "message": "one-sentence explanation, under 18 words",
  "suggestion": "replacement text for the whole field if applicable, otherwise omit",
  "excerpt": "the offending phrase from the field, OR the whole field if you'd rewrite it",
  "anchor": { "kind": "bullet" | "item" | "section" | "header", "id": "<the node id from the JSON>", "headerField": "summary" | "name" | "email" | "phone" | "location" }
}

Severity rules:
- "error" → spelling mistakes, clear grammar errors
- "warn"  → weak verbs, passive voice, vague filler, missing metrics in experience bullets
- "info"  → stylistic nudges, repetition, wordiness

Anchor rules:
- bullet  → use the bullet's id; the whole bullet body is the field
- item    → use the item's id; pass the offending excerpt
- section → use the section's id; for section.title only
- header  → set "id" to "header" and "headerField" to the field name

What to FLAG:
- Spelling typos
- Subject-verb / tense agreement errors
- Tense inconsistency WITHIN one experience item (mixing "led" + "leading")
- Weak action verbs: "worked on", "helped with", "was responsible for", "involved in", "participated in", "assisted", "did". Suggest a stronger verb that fits the bullet.
- Passive voice: "was X-ed by Y" — rewrite active.
- Vague filler: "various", "different", "many", "several things", "a number of"
- Bullets in experience sections with NO numbers / percentages / dollar amounts / counts.
- Bullets that start with "I", "My", "We"
- Wordiness: "in order to" → "to", "for the purpose of" → "to", "due to the fact that" → "because"
- Same action verb used 2+ times in adjacent bullets (mark as repetition)
- Style: ALL-CAPS that isn't an acronym, trailing periods on bullets where other bullets lack them, double spaces

What NOT to flag:
- Stylistic choices the user has clearly made consistently (no period on any bullet = fine; trailing period on EVERY bullet = fine; only flag inconsistency)
- Industry jargon, acronyms in caps, brand names
- Short bullets just because they're short — only flag if vague or weak
- Fields the user has left empty

Return at most 25 issues, prioritising errors > warns > info. If everything is clean, return [].`;

  const user = `Lint the following structured resume. Each text-bearing node carries an id. Anchor each issue back to its node id.

${JSON.stringify(content, null, 2)}`;

  return { system, user };
}

/** Parse the AI's response into a typed LintIssue array. Tolerant
 *  of fenced code blocks, stray prose, and partial JSON — we trim
 *  to the first '[' and last ']' before parsing. Returns an empty
 *  array on failure so the UI never crashes on a flaky AI run. */
export function parseLintResponse(text: string): LintIssue[] {
  if (!text) return [];
  // Strip code fences if present
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  // Pull out the array bounds — first '[' to last ']' — in case the
  // model wrapped the JSON in apology prose.
  const lb = body.indexOf("[");
  const rb = body.lastIndexOf("]");
  if (lb === -1 || rb === -1 || rb < lb) return [];
  body = body.slice(lb, rb + 1);

  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return []; }
  if (!Array.isArray(raw)) return [];

  // Generate stable-ish ids for the React keys + apply tracking.
  let n = 0;
  const issues: LintIssue[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const category = o.category as LintCategory;
    if (!category || !(category in LINT_CATEGORY_META)) continue;
    const message = typeof o.message === "string" ? o.message : "";
    if (!message) continue;
    const severity: LintSeverity =
      o.severity === "error" || o.severity === "warn" || o.severity === "info"
        ? (o.severity as LintSeverity)
        : "warn";

    const anchor = o.anchor as { kind?: string; id?: string; headerField?: string } | undefined;
    const issue: LintIssue = {
      id: `lint_${Date.now().toString(36)}_${(n++).toString(36)}`,
      category,
      severity,
      message,
      suggestion: typeof o.suggestion === "string" ? o.suggestion : undefined,
      excerpt:    typeof o.excerpt    === "string" ? o.excerpt    : undefined,
    };
    if (anchor?.kind === "bullet" && typeof anchor.id === "string") {
      issue.anchorBulletId = anchor.id;
    } else if (anchor?.kind === "item" && typeof anchor.id === "string") {
      issue.anchorItemId = anchor.id;
    } else if (anchor?.kind === "section" && typeof anchor.id === "string") {
      issue.anchorSectionId = anchor.id;
    } else if (anchor?.kind === "header") {
      const f = anchor.headerField;
      if (f === "summary" || f === "name" || f === "email" || f === "phone" || f === "location") {
        issue.anchorHeaderField = f;
      } else {
        issue.anchorHeaderField = "summary";
      }
    } else {
      // No usable anchor → drop the issue; without an anchor we
      // can't show the user where the problem is.
      continue;
    }
    issues.push(issue);
  }
  return issues;
}
