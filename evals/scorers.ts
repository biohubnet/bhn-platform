/**
 * Deterministic eval scorers — pure functions, no AI or DB imports, so they run
 * anywhere (incl. CI without secrets). Retrieval metrics (recall@k, precision@k,
 * MRR) + answer keyword/format + lexical groundedness. The LLM-as-judge
 * correctness/grounding scorer lives in evals/judge.ts (needs AI keys).
 */
const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "and", "or", "is", "are", "for", "on",
  "with", "that", "this", "it", "as", "be", "by", "at", "from", "we", "you",
]);

export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}
export function contentTokens(s: string): string[] {
  return tokenize(s).filter((t) => t.length > 2 && !STOP.has(t));
}

export function recallAtK(rankedIds: string[], relevantIds: string[], k: number): number {
  if (relevantIds.length === 0) return 1;
  const top = new Set(rankedIds.slice(0, k));
  return relevantIds.filter((id) => top.has(id)).length / relevantIds.length;
}
export function precisionAtK(rankedIds: string[], relevantIds: string[], k: number): number {
  const top = rankedIds.slice(0, k);
  if (top.length === 0) return 0;
  const rel = new Set(relevantIds);
  return top.filter((id) => rel.has(id)).length / top.length;
}
export function mrr(rankedIds: string[], relevantIds: string[]): number {
  const rel = new Set(relevantIds);
  for (let i = 0; i < rankedIds.length; i++) if (rel.has(rankedIds[i])) return 1 / (i + 1);
  return 0;
}

/** +1 per mustInclude present, −1 per mustNotInclude present; clamped 0..1. */
export function keywordScore(answer: string, mustInclude: string[] = [], mustNotInclude: string[] = []): number {
  const a = answer.toLowerCase();
  const inc = mustInclude.length ? mustInclude.filter((k) => a.includes(k.toLowerCase())).length / mustInclude.length : 1;
  const penalty = mustNotInclude.length ? mustNotInclude.filter((k) => a.includes(k.toLowerCase())).length / mustNotInclude.length : 0;
  return Math.max(0, Math.min(1, inc - penalty));
}

/** Share of the answer's content tokens that also appear in the context. */
export function groundednessLexical(answer: string, context: string): number {
  const ctx = new Set(contentTokens(context));
  const toks = contentTokens(answer);
  if (toks.length === 0) return 0;
  return toks.filter((t) => ctx.has(t)).length / toks.length;
}

export const avg = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
