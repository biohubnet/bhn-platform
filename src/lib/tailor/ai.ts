/**
 * Resume-tailoring AI prompts.
 *
 * Three jobs the LLM does in this flow:
 *
 *   1. parseRequirements()
 *      Read a JD (free text) and return a list of concrete, separable
 *      requirements — required vs nice-to-have.
 *
 *   2. assessRequirements()
 *      Read the user's materials (resume text + pitch + this-round
 *      user responses) and classify EACH requirement as met / partial
 *      / missing. Returns reasoning + a follow-up question for the
 *      gaps the user hasn't addressed.
 *
 *   3. hiringManagerVerdict()
 *      Play the role of a recruiter / hiring manager. Given the final
 *      assessments, decide yes / maybe / no on interviewing, list the
 *      remaining weaknesses that still need closing.
 *
 * All three use chat() with strict JSON-output prompts. The parsers
 * are tolerant: they try to find JSON inside model output even when
 * the LLM wraps it in markdown ```json``` fences (Cloudflare Workers
 * AI does this often).
 */
import { chat, type ChatMessage } from "@/lib/ai";
import type {
  Requirement,
  Assessment,
  Verdict,
} from "@/lib/tailor/types";

interface AssessmentInput {
  /** All requirements for this posting. */
  requirements: Requirement[];
  /** What the user has on file across rounds (concat resume + pitch +
   *  prior round responses, formatted in a way the LLM can scan). */
  applicantMaterials: string;
}

interface VerdictInput {
  postingTitle: string;
  companyName: string;
  requirements: Requirement[];
  assessments: Assessment[];
}

// ── 1. Parse JD ─────────────────────────────────────────────────

export async function parseRequirements(
  jd: string,
  postingTitle: string,
  userId: string | null,
): Promise<Requirement[]> {
  const SYSTEM: ChatMessage = {
    role: "system",
    content: [
      "You extract hiring requirements from job descriptions.",
      "Output JSON only. Schema:",
      '{ "requirements": [ { "id": "r1", "text": "...", "importance": "required"|"nice-to-have" }, ... ] }',
      "",
      "Rules:",
      "- One requirement per item. Don't bundle 'X and Y' into one row — split them.",
      "- Use plain language, max 18 words per requirement.",
      "- Classify importance: 'required' (a must-have, the JD says so explicitly OR it's a core competency for the role) vs 'nice-to-have' (preferred / a plus / bonus).",
      "- Ignore boilerplate (equal opportunity, benefits, location-only items, application instructions).",
      "- Allocate ids r1, r2, r3, ... sequentially in the order they appear.",
      "- Aim for 6-12 requirements. If the JD is sparse, output what's there.",
    ].join("\n"),
  };
  const USER: ChatMessage = {
    role: "user",
    content: `Job title: ${postingTitle}\n\nJob description:\n${jd}`,
  };

  const result = await chat([SYSTEM, USER], {
    userId,
    feature: "tailor.parse",
    maxTokens: 1400,
    temperature: 0.2,
  });
  if (!result.ok) return [];
  const parsed = extractJson<{ requirements?: Requirement[] }>(result.text);
  const reqs = parsed?.requirements ?? [];
  // Defensive: ensure every row has the expected shape + a deterministic id.
  return reqs
    .filter((r) => typeof r?.text === "string" && r.text.trim().length > 0)
    .slice(0, 20)
    .map((r, i) => ({
      id: typeof r.id === "string" && r.id.length > 0 ? r.id : `r${i + 1}`,
      text: r.text.trim(),
      importance: r.importance === "required" ? "required" : "nice-to-have",
    }));
}

// ── 2. Assess requirements ──────────────────────────────────────

export async function assessRequirements(
  input: AssessmentInput,
  userId: string | null,
): Promise<Assessment[]> {
  const SYSTEM: ChatMessage = {
    role: "system",
    content: [
      "You're a brutally honest but constructive resume coach.",
      "Given a list of requirements and an applicant's materials, classify each requirement as 'met', 'partial', or 'missing'.",
      "Output JSON only. Schema:",
      '{ "assessments": [ { "requirementId": "r1", "classification": "met"|"partial"|"missing", "reasoning": "...", "evidence": "...", "question": "..."|null }, ... ] }',
      "",
      "Rules:",
      "- 'evidence' = a short sentence quoting/paraphrasing the part of the applicant's materials that addresses this requirement. Empty string when nothing addresses it.",
      "- 'reasoning' = one sentence explaining your classification.",
      "- 'question' = a targeted follow-up question for the user, ONLY when classification is 'missing' or 'partial'. Phrase it as a coach: 'Tell me about a time when...', 'What experience do you have with...', 'How did you handle...'. Null when classification is 'met'.",
      "- One assessment per requirement. Don't skip any.",
      "- Keep questions concrete and answerable in 2-4 sentences.",
    ].join("\n"),
  };
  const USER: ChatMessage = {
    role: "user",
    content: [
      "## Requirements",
      ...input.requirements.map((r) => `- (${r.id}, ${r.importance}) ${r.text}`),
      "",
      "## Applicant materials",
      input.applicantMaterials,
    ].join("\n"),
  };

  const result = await chat([SYSTEM, USER], {
    userId,
    feature: "tailor.assess",
    maxTokens: 2400,
    temperature: 0.3,
  });
  if (!result.ok) return input.requirements.map((r) => fallbackAssessment(r.id));
  const parsed = extractJson<{ assessments?: Assessment[] }>(result.text);
  const rows = parsed?.assessments ?? [];
  // Re-shape + fill in any requirements the LLM dropped (defensive).
  const byId = new Map(rows.map((a) => [a.requirementId, a]));
  return input.requirements.map((r) => {
    const a = byId.get(r.id);
    if (!a) return fallbackAssessment(r.id);
    return {
      requirementId: r.id,
      classification:
        a.classification === "met" || a.classification === "partial"
          ? a.classification
          : "missing",
      reasoning: typeof a.reasoning === "string" ? a.reasoning : "",
      evidence: typeof a.evidence === "string" ? a.evidence : "",
      question:
        a.classification === "met"
          ? null
          : (typeof a.question === "string" && a.question.length > 0 ? a.question : null),
    };
  });
}

function fallbackAssessment(requirementId: string): Assessment {
  return {
    requirementId,
    classification: "missing",
    reasoning: "Couldn't reach the AI to assess this one — treating as missing for now. Add your context manually and re-run.",
    evidence: "",
    question: "What experience do you have here? Add a few specific examples.",
  };
}

// ── 3. Hiring-manager verdict ───────────────────────────────────

export async function hiringManagerVerdict(
  input: VerdictInput,
  userId: string | null,
): Promise<{ decision: Verdict; reasoning: string; remainingWeaknesses: string[] }> {
  const SYSTEM: ChatMessage = {
    role: "system",
    content: [
      "You play the role of a fair, experienced hiring manager screening applicants for an entry-to-mid level biomanufacturing / life-sciences role.",
      "Given a list of requirements and the candidate's assessment for each, decide whether to invite the candidate for a first-round interview.",
      "Output JSON only. Schema:",
      '{ "decision": "yes"|"maybe"|"no", "reasoning": "...", "remainingWeaknesses": ["r3", "r7", ...] }',
      "",
      "Rules:",
      "- 'yes' = strong enough to interview. The candidate hits enough required items and shows aptitude on the rest.",
      "- 'maybe' = on the edge. Could go either way; needs more evidence.",
      "- 'no' = too thin. The candidate hasn't addressed enough required items to justify an interview slot.",
      "- 'reasoning' = 2-3 sentences in the voice of a hiring manager talking to a teammate. Speak plainly, not bureaucratically. NOT JSON, just a string.",
      "- 'remainingWeaknesses' = list of requirement ids where the candidate is still partial/missing. Order by importance (required first). Capped at 6.",
    ].join("\n"),
  };
  const reqIndex = new Map(input.requirements.map((r) => [r.id, r]));
  const USER: ChatMessage = {
    role: "user",
    content: [
      `## Posting: ${input.postingTitle} at ${input.companyName}`,
      "",
      "## Per-requirement assessment",
      ...input.assessments.map((a) => {
        const r = reqIndex.get(a.requirementId);
        return `- (${a.requirementId}, ${r?.importance ?? "?"}) ${r?.text ?? "?"} → ${a.classification.toUpperCase()}: ${a.reasoning}`;
      }),
    ].join("\n"),
  };

  const result = await chat([SYSTEM, USER], {
    userId,
    feature: "tailor.verdict",
    maxTokens: 700,
    temperature: 0.4,
  });
  if (!result.ok) {
    return {
      decision: "maybe",
      reasoning: "Couldn't reach the AI for the hiring-manager verdict. Review the per-requirement assessments below and decide whether to keep iterating.",
      remainingWeaknesses: input.assessments
        .filter((a) => a.classification !== "met")
        .map((a) => a.requirementId)
        .slice(0, 6),
    };
  }
  const parsed = extractJson<{ decision?: Verdict; reasoning?: string; remainingWeaknesses?: string[] }>(result.text);
  return {
    decision:
      parsed?.decision === "yes" || parsed?.decision === "no" ? parsed.decision : "maybe",
    reasoning: typeof parsed?.reasoning === "string" ? parsed.reasoning : "",
    remainingWeaknesses: Array.isArray(parsed?.remainingWeaknesses)
      ? parsed.remainingWeaknesses.filter((x) => typeof x === "string").slice(0, 6)
      : [],
  };
}

// ── Helpers ─────────────────────────────────────────────────────

/** Tolerant JSON extraction. LLMs (especially CF Workers AI) like to
 *  wrap JSON in ```json``` fences or sprinkle prose before/after. We
 *  pull out the first {...} or [...] block we can parse. */
function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  // Strip code fences.
  const stripped = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  // Try direct parse first.
  try {
    return JSON.parse(stripped) as T;
  } catch {}
  // Find the first balanced { ... } or [ ... ] block.
  for (const open of ["{", "["]) {
    const close = open === "{" ? "}" : "]";
    const start = stripped.indexOf(open);
    if (start < 0) continue;
    let depth = 0;
    for (let i = start; i < stripped.length; i++) {
      if (stripped[i] === open) depth++;
      else if (stripped[i] === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(stripped.slice(start, i + 1)) as T;
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}
