/**
 * Deterministic lexical retriever used by the retrieval eval. Ranks a fixture
 * corpus by query-token overlap (TF, length-normalized). This is the baseline
 * retriever the harness scores; pointing the eval at the production pgvector
 * retriever instead needs DB + embedding keys (see evals/README.md).
 */
import { contentTokens } from "./scorers";

export interface Doc {
  id: string;
  text: string;
}

export function rankByOverlap(query: string, corpus: Doc[]): string[] {
  const qset = new Set(contentTokens(query));
  return corpus
    .map((d) => {
      const toks = contentTokens(d.text);
      const overlap = toks.filter((t) => qset.has(t)).length;
      return { id: d.id, score: overlap / Math.sqrt(toks.length + 1) };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}
