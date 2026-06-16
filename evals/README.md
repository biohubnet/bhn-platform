# Eval harness

Offline quality checks for the AI features, with a CI regression gate.

## Run it

```bash
npm run eval:baseline   # write evals/baseline.json from the current scores
npm run eval:ci         # deterministic suite + regression check vs baseline (exit 1 on drop)
npm run eval            # full run incl. LLM-as-judge (needs CF_AI_TOKEN / GEMINI_API_KEY) + saves an EvalRun
```

## What it scores

- **Retrieval** (`datasets/retrieval.jsonl`) — a deterministic lexical retriever
  (`retriever.ts`) is ranked against a golden corpus; we report **recall@3**,
  **precision@3**, and **MRR** (`scorers.ts`). No AI/DB needed.
- **Tutor answers** (`datasets/tutor.jsonl`) — keyword/format coverage and
  lexical **groundedness** (deterministic), plus, when AI keys are present,
  **LLM-as-judge** correctness + grounding (`judge.ts`, via the reliability
  wrapper so the judge output is schema-validated).

Prompts/model versions come from `src/lib/ai/prompts.ts` — the **same** source
the runtime uses — so evals test exactly what ships.

## CI gate

`.github/workflows/evals.yml` runs `npm run eval:ci` on PRs touching `src/lib/ai/**`,
`evals/**`, the course Q&A route, or the Prisma schema. It compares each metric
to `evals/baseline.json` and **fails the check** if any drops more than the
tolerance (0.05). It needs no secrets (deterministic path). The job posts the
report as a PR comment.

When an intended change moves a metric, regenerate the baseline with
`npm run eval:baseline` and commit it.

## History

`npm run eval --save` (or any run with `DATABASE_URL`) writes an `EvalRun` row
(commit SHA, scores, pass/fail) so quality can be tracked over time.

## Notes / honest limits

The retrieval eval scores a **baseline lexical retriever** over fixtures, not the
production pgvector retriever (that needs the DB + embedding keys). It is a
regression signal on the retrieval/scoring logic, not an absolute measure of
production recall. The LLM-judge pass requires provider keys and so runs locally
or in a secrets-enabled job, not in the default no-secrets PR gate.
