/**
 * AI behind the Mock Interview practice tool. Three jobs, all on the shared
 * platform chat() helper (Cloudflare Llama → Gemini fallback):
 *   • generateInterviewQuestions — a tailored question set for a role
 *   • evaluateAnswer            — score + feedback for one spoken/typed answer
 *   • summarizeInterview        — an overall debrief from all answers
 *
 * Every model reply is JSON; we parse defensively (models wrap JSON in prose
 * or fences) and clamp/validate so a malformed reply degrades gracefully
 * instead of throwing.
 */
import { chat, type TranscriptWord } from "@/lib/ai";

export type QuestionKind = "behavioral" | "technical" | "situational" | "motivation";
const KINDS: QuestionKind[] = ["behavioral", "technical", "situational", "motivation"];

export interface GeneratedQuestion {
  question: string;
  kind: QuestionKind;
}
export interface AnswerEvaluation {
  score: number; // 0–100 — content quality
  feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number | null; // 0–100 — how assured the delivery sounded/read
  deliveryFeedback: string;  // coaching on pace, fillers, hedging, assertiveness
}

// ── Delivery metrics (from Whisper word timestamps) ───────────────────────

export interface DeliveryMetrics {
  durationSec: number;
  wordCount: number;
  wpm: number;          // speaking pace
  fillerCount: number;  // um / uh / like / you know / sort of …
  fillerRate: number;   // fillers per 100 words
  longPauses: number;   // silences > 1.2s between words
}

const SINGLE_FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "err", "ah", "ahh", "hmm", "mhm", "like"]);
const MULTI_FILLERS = [/\byou know\b/gi, /\bsort of\b/gi, /\bkind of\b/gi, /\bi mean\b/gi, /\byou see\b/gi];
const PAUSE_THRESHOLD = 1.2; // seconds

/** Compute objective delivery metrics from Whisper word timings. Returns null
 *  when there aren't enough timestamped words to be meaningful (e.g. a typed
 *  answer, or a model that didn't return word timings). */
export function computeDelivery(words: TranscriptWord[], fullText: string): DeliveryMetrics | null {
  if (!Array.isArray(words) || words.length < 5) return null;
  const durationSec = Math.max(0, words[words.length - 1].end - words[0].start);
  if (durationSec < 1) return null;
  const wordCount = words.length;
  const wpm = Math.round(wordCount / (durationSec / 60));

  let fillerCount = 0;
  for (const w of words) {
    const clean = w.word.toLowerCase().replace(/[^a-z]/g, "");
    if (SINGLE_FILLERS.has(clean)) fillerCount++;
  }
  for (const re of MULTI_FILLERS) fillerCount += (fullText.match(re) ?? []).length;

  let longPauses = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].end > PAUSE_THRESHOLD) longPauses++;
  }

  return {
    durationSec: Math.round(durationSec),
    wordCount,
    wpm,
    fillerCount,
    fillerRate: Math.round((fillerCount / wordCount) * 1000) / 10,
    longPauses,
  };
}

/** Qualitative pace label for the UI. */
export function paceLabel(wpm: number): string {
  if (wpm < 100) return "measured — could pick up the pace a little";
  if (wpm <= 160) return "a natural, confident pace";
  if (wpm <= 185) return "slightly fast";
  return "rushed — slow down and breathe";
}

/** Pull the first complete JSON value (object or array) out of a model reply.
 *  Scans for the bracket that BALANCES the first opener (string-aware), so a
 *  reply with prose or a second JSON blob after it still parses correctly —
 *  `lastIndexOf` would grab the wrong closer. */
function extractJson<T>(raw: string): T | null {
  if (typeof raw !== "string") return null; // defensive: never call string ops on a non-string
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const firstArr = cleaned.indexOf("[");
  const firstObj = cleaned.indexOf("{");
  const starts = [firstArr, firstObj].filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const clampScore = (n: unknown): number => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
};
const asStringList = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 280)).slice(0, max)
    : [];
const normalizeKind = (v: unknown): QuestionKind =>
  typeof v === "string" && (KINDS as string[]).includes(v) ? (v as QuestionKind) : "behavioral";

// ── Question generation ──────────────────────────────────────────────────

export async function generateInterviewQuestions(input: {
  role: string;
  context?: string;
  count: number;
  userId?: string | null;
}): Promise<GeneratedQuestion[]> {
  const count = Math.max(3, Math.min(10, input.count));
  const system = [
    "You are an experienced interviewer for biotech / life-sciences and tech roles.",
    "Produce a realistic mock-interview question set for the given role.",
    "Mix question kinds: behavioral (STAR), situational, motivation, and (only if the role is technical) technical.",
    "Questions must be answerable out loud in 1–3 minutes. No multi-part compound questions. No preamble.",
    `Respond with ONLY a JSON array of exactly ${count} objects: [{"question": string, "kind": "behavioral"|"technical"|"situational"|"motivation"}]`,
  ].join("\n");
  const user = [
    `Role: ${input.role}`,
    input.context?.trim() ? `Context / focus (job description or notes):\n${input.context.trim().slice(0, 2000)}` : "No extra context provided — keep questions broadly applicable to the role.",
    `Generate ${count} questions, ordered easiest-to-hardest.`,
  ].join("\n\n");

  const res = await chat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 900, temperature: 0.7, feature: "mock_interview_questions", userId: input.userId },
  );
  if (!res.ok) return fallbackQuestions(input.role, count);

  const parsed = extractJson<{ question?: unknown; kind?: unknown }[]>(res.text);
  const out: GeneratedQuestion[] = Array.isArray(parsed)
    ? parsed
        .filter((q) => typeof q?.question === "string" && (q.question as string).trim().length > 0)
        .map((q) => ({ question: (q.question as string).trim().slice(0, 600), kind: normalizeKind(q.kind) }))
        .slice(0, count)
    : [];
  return out.length >= 3 ? out : fallbackQuestions(input.role, count);
}

/** Deterministic safety net so a session can always start, even if AI is down. */
function fallbackQuestions(role: string, count: number): GeneratedQuestion[] {
  const bank: GeneratedQuestion[] = [
    { question: `Tell me about yourself and why you're interested in a ${role} role.`, kind: "motivation" },
    { question: "Walk me through a project you're most proud of. What was your specific contribution?", kind: "behavioral" },
    { question: "Describe a time you faced a significant setback or failure. What did you do, and what did you learn?", kind: "behavioral" },
    { question: "Tell me about a time you had a conflict with a teammate. How did you resolve it?", kind: "behavioral" },
    { question: `Imagine your top priority for the quarter is suddenly deprioritized. As a ${role}, how would you respond?`, kind: "situational" },
    { question: "How do you prioritize when everything feels urgent and you're short on time?", kind: "situational" },
    { question: "What's a skill you've deliberately worked to improve recently, and how?", kind: "motivation" },
    { question: "Where do you see the biggest opportunity or risk in this field over the next few years?", kind: "technical" },
  ];
  return bank.slice(0, Math.max(3, Math.min(count, bank.length)));
}

// ── Answer evaluation ────────────────────────────────────────────────────

export async function evaluateAnswer(input: {
  role: string;
  question: string;
  questionKind: string;
  transcript: string;
  /** Delivery metrics from the recording (voice answers only). */
  delivery?: DeliveryMetrics | null;
  userId?: string | null;
}): Promise<AnswerEvaluation> {
  const d = input.delivery ?? null;
  const deliveryLine = d
    ? `Delivery metrics from the recording: spoke ~${d.wordCount} words in ${d.durationSec}s (${d.wpm} words/min, ${paceLabel(d.wpm)}); ${d.fillerCount} filler word(s) (${d.fillerRate} per 100 words); ${d.longPauses} long pause(s).`
    : "No audio delivery metrics (the answer was typed, or timing wasn't available) — judge confidence only from the wording (hedging, qualifiers, assertiveness).";

  const system = [
    "You are a supportive but honest interview coach. Evaluate ONE answer to ONE interview question on two SEPARATE axes:",
    "1) CONTENT (score): relevance, structure (STAR for behavioral), specificity / concrete evidence, clarity.",
    "2) CONFIDENCE (confidence): how assured and credible the delivery comes across. Use the delivery metrics when given (pace, fillers, pauses) AND the wording (hedging like 'I think maybe', 'sort of', 'I guess', 'probably', over-apologizing, trailing off vs. direct, owned statements). A great answer can still be undersold by shaky delivery, and vice-versa.",
    "Be encouraging and concrete. Strengths/improvements are about CONTENT; deliveryFeedback is one or two sentences of specific delivery coaching (e.g. cut a named filler, slow down, state it without hedging). Never generic.",
    "Speech transcripts have natural disfluencies — coach them, don't harshly penalize.",
    'Respond with ONLY JSON: {"score": number 0-100, "feedback": string (2-4 sentences), "strengths": string[] (1-3), "improvements": string[] (1-3), "confidence": number 0-100, "deliveryFeedback": string (1-2 sentences)}',
  ].join("\n");
  const user = [
    `Role: ${input.role}`,
    `Question (${input.questionKind}): ${input.question}`,
    `Candidate's answer (transcript): ${input.transcript.trim().slice(0, 4000) || "(no answer given)"}`,
    deliveryLine,
  ].join("\n\n");

  const res = await chat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 700, temperature: 0.4, feature: "mock_interview_eval", userId: input.userId },
  );
  if (!res.ok) {
    return {
      score: 0,
      feedback: "We couldn't score this answer automatically right now — your transcript is saved, try scoring again later.",
      strengths: [],
      improvements: [],
      confidence: null,
      deliveryFeedback: "",
    };
  }
  const p = extractJson<Record<string, unknown>>(res.text) ?? {};
  // Only accept a genuinely numeric confidence — a garbage value (e.g.
  // "high") must read as "not scored" (null), not a misleading 0/100.
  const confidence = typeof p.confidence === "number" && Number.isFinite(p.confidence) ? clampScore(p.confidence) : null;
  return {
    score: clampScore(p.score),
    feedback: typeof p.feedback === "string" ? p.feedback.trim().slice(0, 1200) : "",
    strengths: asStringList(p.strengths, 3),
    improvements: asStringList(p.improvements, 3),
    confidence,
    deliveryFeedback: typeof p.deliveryFeedback === "string" ? p.deliveryFeedback.trim().slice(0, 600) : "",
  };
}

// ── Per-question coaching ("how to answer" + what employers want) ─────────

export interface AnswerGuidance {
  intent: string;          // what the interviewer is really assessing
  approach: string;        // how to structure / approach THIS answer
  wantToHear: string[];    // specific signals employers want to hear
  avoid: string[];         // common pitfalls
  modelOutline: string[];  // skeleton of a strong answer (phrases, not a script)
}

// Runtime system prompt for the coaching generator. Synthesized from a panel
// of three hiring perspectives (behavioral interviewer, hiring manager,
// recruiter) — see the interview-coaching-framework workflow.
const GUIDANCE_SYSTEM_PROMPT = `
You are an interview coach. You receive a ROLE, one INTERVIEW QUESTION, and the question's KIND (one of: behavioral, situational, motivation, technical). Return coaching for answering THAT specific question, tailored to THAT role.

Respond with ONLY a JSON object — no preamble, no markdown, no code fences — with exactly these fields:
{
  "intent": string,        // 1-2 sentences: what the interviewer is REALLY assessing with this question. Name the underlying competency/risk being priced (e.g. ownership, judgment under constraint, coachability, durable fit), not the surface topic.
  "approach": string,      // 2-4 sentences: how to STRUCTURE and approach THIS answer for THIS role. Be directive and concrete. Apply the kind-specific method below.
  "wantToHear": string[],  // 3-5 specific signals an employer for THIS role wants in this answer
  "avoid": string[],       // 2-4 pitfalls specific to this question/kind
  "modelOutline": string[] // a skeleton of a strong answer as short bullet-like phrases — a scaffold, NOT a full scripted answer
}

CORE PRINCIPLES (apply to every question):
- Evidence over adjectives. Every claim must attach to a specific, dated, verifiable action the candidate personally took. "Strong leader" with no example is noise.
- "I" not "we." Isolate the candidate's personal contribution from the team's; the score is set by what THEY decided and did. Coach precise phrasing: "the team shipped X; my part was Y; I made the call to Z."
- Quantify stakes and outcome. Push for a number, before/after, or observable result; "it went well" is unscoreable.
- Reward decision quality under constraint, not lucky outcomes. Surface the tradeoff, what was known at the time, and the alternatives weighed.
- Land the reflection. End with what was learned and how it changed later behavior — this is half the signal and reads as senior.
- Calibrated honesty beats manufactured confidence. "I don't know — here's how I'd find out" outscores a confident bluff. Bluffing, caught once, poisons trust in everything.
- Brevity is a scored competency. Lead with the point in the first ~20 seconds; a tight 90-second answer reads more senior than a rambling 4-minute one. The interviewer scores against a rubric and writes near-verbatim quotes — give them concrete, quotable moments.
- Survive the follow-up. Volunteer the "why" and the tradeoff up front so probing finds depth, not a hole.
- Recency and altitude. Prefer stories from the last 2-3 years at the scope of the target role.

KIND-SPECIFIC METHOD:
- behavioral: Demand ONE specific past event (reject "I always..." / "what I usually do" — that hides the absence of a real instance). Use STAR as a scaffold, not a script; don't announce "the Situation was." Compress Situation + Task to ~2 sentences of stakes-setting context (scope, what was at risk, the constraint, the candidate's specific responsibility), spend ~60-70% on Action (the 2-4 concrete moves THEY made, alternatives weighed, why they chose, pushback handled), close the Result with a number, then a one-line learning. Steer toward stories with real tension — conflict, failure, ambiguity, a hard call. A frictionless story is unscoreable.
- situational: Score the reasoning process, not a "right answer." Forbid jumping straight to a solution. First state assumptions and the information to gather ("I'd want to know X, Y, Z first"), then stakeholders and tradeoffs, then a structured path (stabilize -> root cause -> prevent), naming what would change the decision. The strongest move: anchor to reality — "I actually faced something close, and here's what I did" — converting a hypothetical into evidence. Coach collaboration over hero-play.
- motivation: Filter for genuine, durable, specific interest vs. spray-and-pray. Demand something concrete and true ONLY of this company/role (a product decision, problem domain, value, stage) tied to a real throughline in the candidate's history so it's credible, not flattery. For "why leaving," stay net-positive — pull toward what they want, never trash the current employer (the interviewer hears how they'll later describe THIS company). For "weakness," name a real, contained one plus the mechanism to manage it and evidence of movement — never a humblebrag ("perfectionist," "I work too hard"). Tie goals to a plausible path within the role so it signals retention. Check coherence with resume and later questions.
- technical: Score the problem-solving process and behavior when stuck, not just the final answer. Restate the problem and confirm constraints/requirements before solving (diving in unscoped is a red flag). Think out loud — silence reads as blank. State the approach and its tradeoffs ("X for simplicity, but it costs Y at scale"). When stuck, narrate the debugging path; treat hints as collaboration. If they don't know, say so cleanly and reason about how they'd find out — never fabricate. Go one level deeper than the surface to prove real understanding, match depth to the role's seniority, and connect choices to consequences (cost, latency, maintainability, team velocity). Be ready to defend a choice, then concede gracefully when pushed — that previews every code review.

TAILORING RULES:
- Make everything specific to the given ROLE and QUESTION — map the answer onto that role's real pace, autonomy, failure tolerance, and altitude. Never produce generic advice that could apply to any role.
- modelOutline is a skeleton (phrases/beats), never a full scripted answer to recite.
- Output ONLY the JSON object.
`;

const asGuidanceList = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 320)).slice(0, max)
    : [];

export async function generateAnswerGuidance(input: {
  role: string;
  question: string;
  questionKind: string;
  userId?: string | null;
}): Promise<AnswerGuidance | null> {
  const user = [
    `Role: ${input.role}`,
    `Question kind: ${input.questionKind}`,
    `Question: ${input.question}`,
  ].join("\n");

  const res = await chat(
    [{ role: "system", content: GUIDANCE_SYSTEM_PROMPT }, { role: "user", content: user }],
    { maxTokens: 800, temperature: 0.5, feature: "mock_interview_guidance", userId: input.userId },
  );
  if (!res.ok) return null;
  const p = extractJson<Record<string, unknown>>(res.text);
  if (!p) return null;
  const intent = typeof p.intent === "string" ? p.intent.trim().slice(0, 600) : "";
  const approach = typeof p.approach === "string" ? p.approach.trim().slice(0, 1000) : "";
  const wantToHear = asGuidanceList(p.wantToHear, 6);
  const avoid = asGuidanceList(p.avoid, 5);
  const modelOutline = asGuidanceList(p.modelOutline, 6);
  // Require at least the core fields to consider it usable.
  if (!intent && !approach && wantToHear.length === 0) return null;
  return { intent, approach, wantToHear, avoid, modelOutline };
}

// ── Overall summary ──────────────────────────────────────────────────────

export async function summarizeInterview(input: {
  role: string;
  answers: { question: string; transcript: string; score: number | null; confidence?: number | null }[];
  userId?: string | null;
}): Promise<{ overallScore: number; summary: string }> {
  const answered = input.answers.filter((a) => a.transcript.trim().length > 0);
  const avg = answered.length
    ? Math.round(answered.reduce((s, a) => s + (a.score ?? 0), 0) / answered.length)
    : 0;
  const withConf = answered.filter((a) => typeof a.confidence === "number");
  const avgConf = withConf.length
    ? Math.round(withConf.reduce((s, a) => s + (a.confidence ?? 0), 0) / withConf.length)
    : null;

  const system = [
    "You are an interview coach writing a short end-of-session debrief.",
    "Summarize the candidate's overall performance across the whole mock interview: 2-4 sentences, warm and specific.",
    "Cover BOTH content (what they said) and, when a confidence read is given, delivery (how they came across). Name the strongest theme and the single highest-leverage thing to work on next. No bullet lists, no preamble.",
    'Respond with ONLY JSON: {"summary": string}',
  ].join("\n");
  const user = [
    `Role: ${input.role}`,
    `Per-question results (content score / confidence):\n${input.answers.map((a, i) => `${i + 1}. [content ${a.score ?? "—"} · confidence ${a.confidence ?? "—"}] ${a.question}\n   Answer: ${a.transcript.trim().slice(0, 600) || "(skipped)"}`).join("\n")}`,
    `Computed averages — content: ${avg}/100${avgConf !== null ? `; delivery confidence: ${avgConf}/100` : " (no voice answers, so no delivery read)"}.`,
  ].join("\n\n");

  const res = await chat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { maxTokens: 400, temperature: 0.5, feature: "mock_interview_summary", userId: input.userId },
  );
  let summary = "";
  if (res.ok) {
    const p = extractJson<{ summary?: unknown }>(res.text);
    summary = p && typeof p.summary === "string" ? p.summary.trim().slice(0, 1500) : res.text.trim().slice(0, 1500);
  }
  if (!summary) {
    summary = answered.length
      ? `You completed ${answered.length} of ${input.answers.length} questions with an average of ${avg}/100. Review the per-question feedback above and re-run the session to track your improvement.`
      : "No answers were recorded in this session.";
  }
  return { overallScore: avg, summary };
}
