# AI reliability & evals

How the **runtime reliability path** and the **offline eval loop** fit together
for the platform's AI features.

## Runtime path

```
route → callText / callStructured (src/lib/ai/reliability.ts)
          → chat() (src/lib/ai/index.ts): Cloudflare Llama → Gemini fallback
          → logInteraction → AIInteraction (telemetry: cost, promptVersion, validation)
```

- **Reliability wrapper** (`src/lib/ai/reliability.ts`)
  - `callText()` — prose answers with **retries + exponential backoff** and a
    per-call **timeout** (`AbortSignal.timeout`, passed into the provider fetch).
  - `callStructured(schema)` — **zod**-validated JSON output, with a single
    **repair-retry** then a fail-safe `ok:false` (never throws). The validation
    result is written to the call's telemetry row.
  - `delimitContext()` / `sanitizeRagContext()` — **prompt-injection defense**
    for RAG: untrusted retrieved text is length-capped, instruction-like lines
    are redacted, and it's wrapped in tags the system prompt declares data-only.
  - The Cloudflare→Gemini **provider fallback** lives in `chat()`.
- **Single source of truth** — `src/lib/ai/prompts.ts` holds each prompt + its
  `version`; imported by both the runtime and the eval harness, so evals test
  exactly what ships. The version is recorded on every telemetry row.
- **Telemetry** — `AIInteraction` (Prisma) logs provider, model, tokens,
  latency, success/error, **cost** (`src/lib/ai/pricing.ts`), `promptVersion`,
  and `validationPassed` for every call.
- **Observability** — `/admin/ai-metrics` (admin-only) shows call volume, error
  rate, p50/p95 latency, cost, and valid-output (acceptance) rate, per day and
  per feature, over a 7/30/90-day window.

Wired example: `src/app/api/courses/[id]/ask/route.ts` (course Q&A) routes
through `callText` with delimited/sanitized context and the versioned
`COURSE_TUTOR` prompt.

## Offline loop

- **Harness** — `evals/` (golden datasets, deterministic scorers, LLM-as-judge,
  runner). See `evals/README.md`.
- **History** — each run can persist an `EvalRun` row (commit, scores, pass/fail).
- **CI gate** — `.github/workflows/evals.yml` runs the deterministic suite on
  PRs touching the AI layer and fails on a metric drop vs `evals/baseline.json`.

## The loop

Telemetry (runtime) surfaces where quality/cost/latency move; the eval harness
(offline) pins answer + retrieval quality against a golden set and gates
regressions in CI; the shared `prompts.ts` keeps both measuring the same thing.

## Honest scope

Coverage today: the reliability wrapper is used on the course-Q&A path (other AI
routes still call `chat()` directly and can adopt it incrementally); the
retrieval eval scores a baseline lexical retriever over fixtures (not the live
pgvector retriever); the LLM-judge pass needs provider keys so it runs locally /
in secrets-enabled jobs, not the default no-secrets PR gate.
