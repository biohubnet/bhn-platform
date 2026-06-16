/**
 * LLM-as-judge scorer (needs AI keys). Scores a candidate answer 0..1 on
 * correctness vs a reference and groundedness, via the versioned EVAL_JUDGE
 * prompt, routed through the reliability wrapper (schema-validated output).
 * Imported dynamically by evals/run.ts only when AI is configured.
 */
import { z } from "zod";
import { callStructured } from "@/lib/ai/reliability";
import { EVAL_JUDGE } from "@/lib/ai/prompts";

const JudgeSchema = z.object({
  correctness: z.number().min(0).max(1),
  groundedness: z.number().min(0).max(1),
  reason: z.string().optional(),
});

export async function judge(
  question: string,
  reference: string,
  candidate: string,
): Promise<{ correctness: number; groundedness: number } | null> {
  const r = await callStructured(
    [
      { role: "system", content: EVAL_JUDGE.system },
      { role: "user", content: `QUESTION:\n${question}\n\nREFERENCE:\n${reference}\n\nCANDIDATE:\n${candidate}` },
    ],
    JudgeSchema,
    { feature: "eval_judge", promptVersion: EVAL_JUDGE.version, maxTokens: 250, temperature: 0 },
  );
  return r.ok ? { correctness: r.data.correctness, groundedness: r.data.groundedness } : null;
}
