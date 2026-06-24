/**
 * Gap analysis (rule 5): map every JD requirement to the master library
 * as Have / Partial / Gap with evidence, make an honest reach call, and
 * FLAG any claim the JD wants that the master can't support (never
 * paper over a true gap).
 */
import { callStructured, delimitContext } from "@/lib/ai/reliability";
import { GapReportSchema, type GapReport } from "./schemas";
import { factsToContext, type Fact } from "./grounding";

export const GAP_PROMPT_VERSION = "tailor_gap@2026-06-24.1";

const SYSTEM = `You assess how well a candidate's FACTS match a job's requirements. You are grounded ONLY in the provided facts — never assume a fact that isn't listed.

For each must-have and nice-to-have requirement, decide:
- "have": the facts clearly support it (cite the bullet ids in evidenceBulletIds).
- "partial": the facts partly support it; say what's missing in rationale and the single thing that would close it in closeWith.
- "gap": the facts don't support it; closeWith names the evidence that would.

Then a reachCall:
- "strong": all/most must-haves are have.
- "stretch": some must-haves are partial/gap but the candidate could honestly stretch.
- "skip": must-haves require a different profession, a hard credential, or years the facts can't support.

unsupportedClaims: list any requirement the posting needs that the facts cannot honestly support — these must NEVER be fabricated in the resume.

Return ONLY JSON:
{"items":[{"requirement":"","kind":"must|nice","status":"have|partial|gap","evidenceBulletIds":[],"rationale":"","closeWith":null}],"reachCall":"strong|stretch|skip","reachRationale":"","unsupportedClaims":[]}`;

export async function analyzeGap(args: {
  userId: string;
  mustHaves: string[];
  niceToHaves: string[];
  facts: Fact[];
}): Promise<{ ok: true; report: GapReport } | { ok: false; error: string }> {
  const reqs = [
    ...args.mustHaves.map((r) => `MUST: ${r}`),
    ...args.niceToHaves.map((r) => `NICE: ${r}`),
  ].join("\n");
  if (!reqs.trim()) {
    return { ok: true, report: { items: [], reachCall: "stretch", reachRationale: "No explicit requirements were extracted from the posting.", unsupportedClaims: [] } };
  }

  const res = await callStructured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `${delimitContext("candidate_facts", factsToContext(args.facts))}\n\nRequirements:\n${reqs}` },
    ],
    GapReportSchema,
    { feature: "tailor_gap", userId: args.userId, promptVersion: GAP_PROMPT_VERSION, maxTokens: 2600 },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, report: res.data };
}
