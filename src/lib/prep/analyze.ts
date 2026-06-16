/**
 * Resume vs JD analysis.
 *
 * Two paths, in priority order:
 *
 *   1. **AI-assisted** — when chat() is configured (Cloudflare or
 *      Gemini key present), use the LLM to (a) extract a structured
 *      keyword list from the JD and (b) compare against the resume
 *      text with structured output. Cost: 2 chat calls per session.
 *
 *   2. **Heuristic fallback** — when AI isn't available (preview
 *      without secrets, local dev, etc.), use the platform's existing
 *      PostingSkill rows as the keyword set and string-match against
 *      the resume. Lower precision but never fails closed.
 *
 * Either way, the output shape is `PrepStateCompare`: a list of
 * keywords each labeled present / weak / missing, with quoted
 * evidence and per-gap coaching nudges.
 */

import { z } from "zod";
import type { PrepStateCompare } from "./types";
import { callStructured } from "@/lib/ai/reliability";
import { prisma } from "@/lib/prisma";

/** Mirrors the structured JSON the résumé-coach prompt asks for. Kept as
 *  permissive as the previous parse, which was a `JSON.parse(...) as T`
 *  cast (erased at runtime) — so the ONLY hard runtime guard the old code
 *  enforced was "`matches` is a non-empty array". Every per-field value was
 *  read defensively by the sanitizer below (`String(m.keyword)`, the status
 *  ternary, `m.evidence ? … : undefined`), tolerating missing keys, non-string
 *  values, and out-of-union statuses. We reproduce that exact leniency here so
 *  responses the old code accepted don't now get rejected into the heuristic
 *  fallback: `keywords` optional; per-match fields optional + loosely typed;
 *  `matches` required + non-empty. The sanitizer still trims + coerces. */
const AnalysisSchema = z.object({
  keywords: z.array(z.string()).optional(),
  matches: z
    .array(
      z.object({
        keyword: z.string(),
        status: z.string().optional(),
        evidence: z.string().nullish(),
        suggestion: z.string().nullish(),
      }),
    )
    .min(1),
});

interface AnalyzeInput {
  /** JD text — concatenate posting.title + positionDetails + keySkills. */
  jdText: string;
  /** Trainee's resume — plain text (from the elevator pitch if no resume URL). */
  resumeText: string;
  /** Posting ID — to fall back to PostingSkill rows when AI is off. */
  postingId: string;
  /** User ID — passed to the AI logger for telemetry. */
  userId: string;
}

/** Maximum body length we feed to the LLM. JDs longer than this get
 *  truncated to the leading 6 000 chars (which is comfortably under
 *  any chat-model context window for our providers + leaves room for
 *  the resume). */
const MAX_BODY = 6000;

export async function analyzeResumeVsJd(input: AnalyzeInput): Promise<PrepStateCompare> {
  const jd = input.jdText.slice(0, MAX_BODY);
  const resume = input.resumeText.slice(0, MAX_BODY);

  // Try AI path first.
  const ai = await tryAiAnalysis(jd, resume, input.userId);
  if (ai) return ai;

  // Fallback: use the posting's existing PostingSkill rows + a simple
  // case-insensitive substring search. The fallback is deliberately
  // weaker than the AI path — we want users to see the AI value when
  // it's on.
  return heuristicAnalysis(jd, resume, input.postingId);
}

async function tryAiAnalysis(
  jd: string,
  resume: string,
  userId: string,
): Promise<PrepStateCompare | null> {
  const system =
    "You are a careful résumé coach. Extract concrete skills, qualifications, and " +
    "domain keywords from the job description, then compare each against the candidate's " +
    "résumé. For each keyword, classify presence as 'present' (resume clearly demonstrates " +
    "it), 'weak' (resume mentions it but evidence is thin), or 'missing'. " +
    "When weak or missing, give a specific, actionable coaching nudge (max 25 words).\n\n" +
    "Output STRICT JSON only — no markdown, no commentary — matching:\n" +
    `{ "keywords": string[], "matches": [ { "keyword": string, "status": "present"|"weak"|"missing", "evidence": string|null, "suggestion": string|null } ] }\n\n` +
    "Aim for 8–14 keywords. Skip soft adjectives ('passionate', 'driven') — score real " +
    "skills + tools + qualifications. Trim quotes to ≤120 chars.";

  const userPrompt =
    `JOB DESCRIPTION:\n${jd}\n\n` +
    `=====\n\n` +
    `RESUME / CANDIDATE PROFILE:\n${resume || "(empty — candidate hasn't uploaded a resume yet)"}\n\n` +
    `=====\n\n` +
    `Return the JSON now.`;

  const r = await callStructured(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    AnalysisSchema,
    { feature: "prep.analyze-resume-jd", userId, temperature: 0.2, maxTokens: 1400 },
  );

  if (!r.ok) {
    // No usable AI response (provider error, empty/invalid JSON, or no
    // matches) — fall through to heuristic.
    return null;
  }

  const parsed = r.data;

  const matches = parsed.matches.slice(0, 20).map((m) => ({
    keyword: String(m.keyword).slice(0, 80),
    status: (["present", "weak", "missing"] as const).includes(m.status as PrepStateCompare["matches"][number]["status"])
      ? (m.status as PrepStateCompare["matches"][number]["status"])
      : ("missing" as const),
    evidence: m.evidence ? String(m.evidence).slice(0, 180) : undefined,
    suggestion: m.suggestion ? String(m.suggestion).slice(0, 240) : undefined,
  }));

  const alignment = computeAlignment(matches);
  return {
    analyzedAt: new Date().toISOString(),
    resumeSnapshot: resume,
    jdKeywords: (parsed.keywords ?? matches.map((m) => m.keyword)).map((k) => String(k).toLowerCase()).slice(0, 20),
    matches,
    alignmentScore: alignment,
  };
}

async function heuristicAnalysis(
  jd: string,
  resume: string,
  postingId: string,
): Promise<PrepStateCompare> {
  const postingSkills = await prisma.postingSkill.findMany({
    where: { postingId },
    select: {
      required: true,
      skill: { select: { name: true } },
    },
  });

  const lowerResume = resume.toLowerCase();
  const matches = postingSkills.map((ps) => {
    const kw = ps.skill.name;
    const lowerKw = kw.toLowerCase();
    const present = lowerResume.includes(lowerKw);
    const evidence = present ? extractContextWindow(resume, lowerKw, 100) : undefined;
    return {
      keyword: kw,
      status: present ? ("present" as const) : ("missing" as const),
      evidence,
      suggestion: present
        ? undefined
        : `Add a bullet that shows you've used ${kw} — name the project, the action you took, and the measurable result.`,
    };
  });

  return {
    analyzedAt: new Date().toISOString(),
    resumeSnapshot: resume,
    jdKeywords: postingSkills.map((ps) => ps.skill.name.toLowerCase()),
    matches,
    alignmentScore: computeAlignment(matches),
  };
}

/**
 * Pull a short context window around the first occurrence of a needle
 * inside the haystack — used for "evidence" quotes in the fallback path.
 */
function extractContextWindow(haystack: string, needle: string, win: number): string | undefined {
  const idx = haystack.toLowerCase().indexOf(needle);
  if (idx < 0) return undefined;
  const start = Math.max(0, idx - Math.floor(win / 2));
  const end = Math.min(haystack.length, idx + needle.length + Math.floor(win / 2));
  let slice = haystack.slice(start, end).trim();
  if (start > 0) slice = `…${slice}`;
  if (end < haystack.length) slice = `${slice}…`;
  return slice;
}

/** Weighted alignment: present = 1.0, weak = 0.5, missing = 0.0. */
function computeAlignment(matches: PrepStateCompare["matches"]): number {
  if (matches.length === 0) return 0;
  const total = matches.reduce((sum, m) => {
    if (m.status === "present") return sum + 1;
    if (m.status === "weak") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((total / matches.length) * 100);
}
