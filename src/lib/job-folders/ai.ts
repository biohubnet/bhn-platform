/**
 * AI helpers for job-folder content generation.
 *
 *   • generateCoverLetter() — drafts a cover letter from the JD +
 *                              tailored resume content
 *   • generateInterviewPrep() — drafts an interview prep guide
 *                                (likely questions + STAR-framed
 *                                points + posting-specific concerns)
 *
 * Both go through the platform's chat() adapter (Gemini Flash → CF
 * Llama 3.3 fallback). Both return text only — caller decides where
 * to put it (typically into JobFolder.coverLetter / interviewPrep).
 */
import { chat } from "@/lib/ai";
import type { ResumeContent } from "@/lib/resume/types";
import { formatItemDates } from "@/lib/resume/types";

interface BuildPromptInput {
  jdSnippet: string;
  resumeContent: ResumeContent | null;
  candidateName?: string | null;
}

/** Flatten a ResumeContent into a compact text block the model can
 *  reference without spending its context budget on JSON syntax. */
function resumeAsText(content: ResumeContent | null, name?: string | null): string {
  if (!content) return name ? `Candidate: ${name}` : "";
  const lines: string[] = [];
  const headerName = content.header?.name ?? name;
  if (headerName) lines.push(`Name: ${headerName}`);
  if (content.header?.summary) lines.push(`Summary: ${content.header.summary}`);
  for (const s of content.sections.slice().sort((a, b) => a.position - b.position)) {
    if (s.items.length === 0) continue;
    lines.push("");
    lines.push(`## ${s.title ?? s.kind.toUpperCase()}`);
    for (const it of s.items) {
      const head = [it.title, it.subtitle].filter(Boolean).join(" — ");
      const date = formatItemDates(it);
      if (head || date) {
        lines.push(`- ${head}${date ? `  (${date})` : ""}`);
      }
      if (it.description) lines.push(`  ${it.description}`);
      for (const b of it.bullets) {
        if (b.body.trim()) lines.push(`  • ${b.body}`);
      }
      if (it.metric) lines.push(`  · ${it.metric}`);
    }
  }
  return lines.join("\n").slice(0, 8000);
}

// ── Cover letter ────────────────────────────────────────────────

const COVER_LETTER_SYSTEM = `You write a tailored cover letter for a specific job.

PRINCIPLES:
- 3-4 short paragraphs (≤300 words total).
- Open with one specific reason this role is a fit — name the company, the role, and the most relevant thing from the resume.
- Middle paragraph(s) connect 2-3 concrete experiences from the resume to the job's requirements. Use real bullet content; never invent.
- Close with availability + thanks.
- Plain professional English, no clichés ("dynamic", "passionate", "team player"), no filler.
- Address dear hiring manager unless the JD names someone.

OUTPUT: plain text. No JSON, no markdown headers, no signature block, no \`\`\` fences. Just the letter body.`;

export async function generateCoverLetter(args: BuildPromptInput & { userId?: string | null }): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!args.jdSnippet.trim()) {
    return { ok: false, error: "Add a job description first — the AI needs something to tailor to." };
  }
  const resume = resumeAsText(args.resumeContent, args.candidateName);
  const user = [
    `JOB DESCRIPTION:`,
    args.jdSnippet.slice(0, 8000),
    "",
    `CANDIDATE RESUME:`,
    resume || "(no resume linked — write based on the JD only, but call this out)",
  ].join("\n");
  const result = await chat(
    [
      { role: "system", content: COVER_LETTER_SYSTEM },
      { role: "user", content: user },
    ],
    { userId: args.userId, feature: "job_folder_cover_letter", maxTokens: 1500 },
  );
  if (!result.ok || !result.text.trim()) {
    return { ok: false, error: result.ok ? "Empty AI response." : result.error };
  }
  return { ok: true, text: result.text.trim() };
}

// ── Interview prep ──────────────────────────────────────────────

const INTERVIEW_PREP_SYSTEM = `You produce a personalised interview prep guide for a specific role.

OUTPUT: well-structured markdown with these sections in this order:
  ## Likely questions
    A bullet list of 8-12 questions the candidate should expect — mix of behavioural, technical (per the JD), and role-specific. Lead each with a short rationale ("They'll ask this because…").
  ## STAR-framed answers from the resume
    For 3-4 of the questions above, propose a candidate answer grounded in their actual resume bullets. Format each as:
      **Question:** …
      - **Situation:** …
      - **Task:** …
      - **Action:** …
      - **Result:** …
    Never invent facts; if the resume doesn't have a clear fit, say "no clean match — prepare a fresh story for this one."
  ## Questions to ASK them
    5-7 questions the candidate should ask the interviewer — specific to the company / role / posting. Avoid generic ("what's the culture like").
  ## Gotchas + things to research
    Specific named topics from the JD that aren't covered in the resume. Mark each "research" or "rehearse a story".

Plain professional English. No emojis. No filler.`;

export async function generateInterviewPrep(args: BuildPromptInput & { userId?: string | null }): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!args.jdSnippet.trim()) {
    return { ok: false, error: "Add a job description first — the AI needs something to tailor to." };
  }
  const resume = resumeAsText(args.resumeContent, args.candidateName);
  const user = [
    `JOB DESCRIPTION:`,
    args.jdSnippet.slice(0, 8000),
    "",
    `CANDIDATE RESUME:`,
    resume || "(no resume linked — produce a generic prep guide and call this out at the top)",
  ].join("\n");
  const result = await chat(
    [
      { role: "system", content: INTERVIEW_PREP_SYSTEM },
      { role: "user", content: user },
    ],
    { userId: args.userId, feature: "job_folder_interview_prep", maxTokens: 3000 },
  );
  if (!result.ok || !result.text.trim()) {
    return { ok: false, error: result.ok ? "Empty AI response." : result.error };
  }
  return { ok: true, text: result.text.trim() };
}

// ── Rate-my-fit assessment ──────────────────────────────────────

/**
 * Honest "you-vs-JD" fit assessment. Returns a 0–100 score plus
 * three strengths and three gaps. The goal is calibration, not
 * cheerleading — the system prompt asks the model to be candid,
 * specific, and to never invent strengths the resume doesn't
 * support.
 */
export interface FitAssessment {
  score: number;
  /** 1-sentence verdict shown next to the score. */
  verdict: string;
  /** 3-5 concrete strengths the resume supports. */
  strengths: string[];
  /** 3-5 specific gaps the candidate should address. */
  gaps: string[];
  /** 1-2 sentences of recommended next move. */
  nextMove: string;
}

const RATE_FIT_SYSTEM = `You are a candid recruiting coach.

Given a job description and a candidate resume, produce an HONEST fit assessment. Be specific. Don't cheerlead. Don't invent strengths the resume doesn't actually support.

OUTPUT: STRICT JSON. No markdown, no commentary, no code fences. Exact schema:
{
  "score": 0–100 integer (overall fit; 50 = mixed, 70 = solid, 85+ = strong),
  "verdict": "single sentence summary",
  "strengths": [3–5 short bullets, each grounded in a specific resume item — quote it],
  "gaps": [3–5 short bullets, each naming a JD requirement the resume doesn't cover or covers weakly],
  "nextMove": "1–2 sentences — the most useful thing this candidate should do before applying"
}

Scoring rubric:
  85–100: clear strong-meets on the named requirements + obvious depth.
  70–84: solid fit, 1–2 gaps that are addressable.
  55–69: mixed — half the requirements covered, half visibly missing or weak.
  40–54: stretch — likely not yet ready, but applying isn't a waste.
  Below 40: significant gap; better to use this JD to learn what to build than to apply blind.`;

export async function rateFit(args: {
  jdSnippet: string;
  resumeContent: unknown;
  candidateName?: string | null;
  userId?: string | null;
}): Promise<{ ok: true; assessment: FitAssessment } | { ok: false; error: string }> {
  if (!args.jdSnippet.trim()) {
    return { ok: false, error: "Add a job description first — the AI needs something to rate against." };
  }
  // resumeAsText is typed for the structured ResumeContent shape; we
  // accept unknown at the boundary and trust the same runtime checks
  // it uses internally for malformed input.
  const resume = resumeAsText(
    args.resumeContent as Parameters<typeof resumeAsText>[0],
    args.candidateName,
  );
  if (!resume) {
    return { ok: false, error: "Link a resume first — the AI needs the candidate side too." };
  }
  const user = [
    "JOB DESCRIPTION:",
    args.jdSnippet.slice(0, 8000),
    "",
    "CANDIDATE RESUME:",
    resume,
    "",
    "Return the JSON now.",
  ].join("\n");
  const result = await chat(
    [
      { role: "system", content: RATE_FIT_SYSTEM },
      { role: "user", content: user },
    ],
    { userId: args.userId, feature: "job_folder_rate_fit", maxTokens: 1200, temperature: 0.3 },
  );
  if (!result.ok || !result.text.trim()) {
    return { ok: false, error: result.ok ? "Empty AI response." : result.error };
  }
  const cleaned = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<FitAssessment>;
    if (
      typeof parsed.score !== "number" ||
      typeof parsed.verdict !== "string" ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.gaps) ||
      typeof parsed.nextMove !== "string"
    ) {
      return { ok: false, error: "Model returned a malformed assessment." };
    }
    return {
      ok: true,
      assessment: {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        verdict: parsed.verdict.slice(0, 300),
        strengths: parsed.strengths.filter((s) => typeof s === "string").slice(0, 6) as string[],
        gaps: parsed.gaps.filter((s) => typeof s === "string").slice(0, 6) as string[],
        nextMove: parsed.nextMove.slice(0, 400),
      },
    };
  } catch {
    return { ok: false, error: "Couldn't parse the AI response." };
  }
}
