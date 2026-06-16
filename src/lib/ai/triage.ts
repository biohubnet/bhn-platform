/**
 * The triage agent's brain: classify a flagged AI tutor answer. Output is
 * schema-validated (zod via callStructured) — the agent's output guardrail.
 * Imported by the Inngest agent (src/lib/agent/runTriage.ts) and the agent
 * eval (evals/agent-scorers.ts), so both test the same logic + prompt version.
 */
import { z } from "zod";
import { callStructured } from "@/lib/ai/reliability";

export const TRIAGE_PROMPT_VERSION = "2026-06-16.1";
export const TRIAGE_CATEGORIES = ["incomplete", "ungrounded", "off_topic", "looks_fine"] as const;
export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

export const TriageSchema = z.object({
  category: z.enum(TRIAGE_CATEGORIES),
  severity: z.enum(["low", "medium", "high"]),
  suggestion: z.string().max(500),
});
export type TriageResult = z.infer<typeof TriageSchema>;

export const TRIAGE_SYSTEM =
  "You triage flagged AI tutor answers for a biomanufacturing training platform. " +
  "Given a flagged ANSWER and why it was flagged, classify it. " +
  "category: incomplete (missing key info) | ungrounded (claims not supported / likely hallucinated) | " +
  "off_topic (doesn't answer the question) | looks_fine (actually acceptable). " +
  "severity: low | medium | high. Then a one-sentence suggestion for the human reviewer. " +
  "Reply with ONLY a JSON object {\"category\":...,\"severity\":...,\"suggestion\":...} — no prose.";

export async function triageAnswer(input: { answer: string; reason: string }): Promise<TriageResult | null> {
  const r = await callStructured(
    [
      { role: "system", content: TRIAGE_SYSTEM },
      { role: "user", content: `FLAGGED BECAUSE: ${input.reason}\n\nANSWER:\n${input.answer.slice(0, 3000)}` },
    ],
    TriageSchema,
    { feature: "triage_agent", promptVersion: TRIAGE_PROMPT_VERSION, maxTokens: 220, temperature: 0 },
  );
  return r.ok ? r.data : null;
}
