/**
 * Draft the resume + cover (rules 6–10), grounded ONLY in retrieved
 * facts: lead with exact-match assets + the candidate's moat, mirror
 * JD must-have phrasing, apply persona framing by role archetype, and
 * obey the human-voice + house-style rules. Never invents a metric.
 */
import { callStructured, delimitContext } from "@/lib/ai/reliability";
import { DraftSchema, type Draft } from "./schemas";
import { factsToContext, type Fact } from "./grounding";
import { BANNED_WORDS } from "./voice";

export const DRAFT_PROMPT_VERSION = "tailor_draft@2026-06-24.1";

/** Coarse role archetype → framing guidance (rule 10). */
export function roleArchetype(title: string): { archetype: string; framing: string } {
  const t = title.toLowerCase();
  if (/(finance|fintech|crypto|invest|trading|capital|bank)/.test(t))
    return { archetype: "finance/fintech", framing: "Lead with the person and their financial/quantitative credentials before tooling." };
  if (/(design|ux|ui|product design|brand|creative)/.test(t))
    return { archetype: "design", framing: "Establish career-long-designer tenure up front; show craft and outcomes, not just tools." };
  if (/(communications|comms|content|writer|editor|pr|marketing)/.test(t))
    return { archetype: "communications", framing: "Lead with communications verbs (wrote, edited, pitched, published); de-emphasize 'produced'." };
  if (/(manager|lead|head|director|principal)/.test(t))
    return { archetype: "leadership", framing: "If people-management isn't in the facts, frame leadership honestly as scope/ownership — never claim direct reports you don't have." };
  if (/(engineer|developer|software|data|ml|ai)/.test(t))
    return { archetype: "engineering", framing: "Lead with shipped systems and measurable impact; name the stack only where the JD asks for it." };
  return { archetype: "general", framing: "Lead with the rarest exact-match assets for this role, then the candidate's strongest evidence." };
}

const SYSTEM = `You are an expert resume + cover-letter writer. You write in a concrete, human voice and you NEVER invent facts, numbers, employers, dates, or skills. You may ONLY use the candidate FACTS provided; reframe and select them, but never add a claim that isn't grounded in a fact. If the job wants something the facts don't support, leave it out — do not fabricate.

Rules:
- Lead with the exact-match assets for THIS job and the candidate's strongest, rarest evidence — not a generic summary.
- Mirror the job's must-have phrasing for keywords (ATS match), but only where a fact supports it.
- Every metric you state must come from a fact and state its mechanism (how it was achieved).
- Human voice: vary sentence rhythm; concrete texture over generic claims. NEVER use these words: ${BANNED_WORDS.slice(0, 18).join(", ")}.
- House style: no em dashes, no pipe characters, reverse-chronological experience. Bullets start with a strong, specific verb.
- Cover letter: one page, specific to this company and role, grounded in the same facts.

Return ONLY this JSON (no prose, no fences):
{"header":{"name":"","email":"","phone":"","location":"","summary":""},"sections":[{"kind":"experience|skills|education|projects|certifications|summary|other","title":"","items":[{"title":"","subtitle":"","dateRange":"","bullets":[""]}]}],"coverLetter":""}`;

export async function draftApplication(args: {
  userId: string;
  jobTitle: string;
  company: string;
  mustHaves: string[];
  niceToHaves: string[];
  facts: Fact[];
  rules: string[];
  header?: { name?: string; email?: string; phone?: string; location?: string; summary?: string } | null;
}): Promise<{ ok: true; draft: Draft } | { ok: false; error: string }> {
  const { archetype, framing } = roleArchetype(args.jobTitle);
  const rulesBlock = args.rules.length
    ? `\n\nLearned preferences (apply all):\n${args.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : "";
  const headerBlock = args.header
    ? `\n\nUse this contact header verbatim: ${JSON.stringify(args.header)}`
    : "";

  const user = [
    `Target role: ${args.jobTitle} at ${args.company}`,
    `Role archetype: ${archetype}. Framing: ${framing}`,
    "",
    "Must-have keywords to mirror where a fact supports them:",
    args.mustHaves.map((m) => `- ${m}`).join("\n") || "- (none extracted)",
    args.niceToHaves.length ? "\nNice-to-haves:\n" + args.niceToHaves.map((m) => `- ${m}`).join("\n") : "",
    "",
    delimitContext("candidate_facts", factsToContext(args.facts)),
    rulesBlock,
    headerBlock,
  ].join("\n");

  const res = await callStructured(
    [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
    DraftSchema,
    { feature: "tailor_draft", userId: args.userId, promptVersion: DRAFT_PROMPT_VERSION, maxTokens: 4096, temperature: 0.3 },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, draft: res.data };
}
