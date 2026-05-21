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
