# AI triage agent

An autonomous agent that triages the AI review queue: it reads each flagged
answer, classifies it (category + severity), and **proposes** an action for a
human reviewer. It never resolves or sends anything itself.

## Orchestration (not cron)

Runs on **Inngest** (durable execution, retries, `concurrency: 1`), not a Vercel
cron handler:

- `src/lib/inngest/client.ts` — the Inngest client.
- `src/lib/inngest/functions.ts` — `triageScheduled` (cron `0 */6 * * *`) and
  `triageManual` (event `agent/triage.run`).
- `src/app/api/inngest/route.ts` — the serve endpoint Inngest calls.

Local: `npx inngest-cli@latest dev` (point it at `http://localhost:3001/api/inngest`).
Production: connect the deployment to Inngest Cloud (`INNGEST_SIGNING_KEY` /
`INNGEST_EVENT_KEY`). The admin **Run now** button invokes the same logic
directly so the agent is usable without the dev server.

## Guardrails (`src/lib/agent/`)

- **Kill switch / feature flag** — `PlatformSetting` `aiTriageAgentEnabled`
  (default off). The run no-ops unless it's on. Toggle on `/admin/ai-agent`.
- **Scope** — only `flaggedForReview && reviewStatus = "open" && agentTriagedAt = null`
  answers, capped at `TRIAGE_AGENT.batchCap` (10) per run.
- **Output validation** — `triageAnswer()` returns only zod-validated results
  (`src/lib/ai/triage.ts`, via the reliability wrapper).
- **Human approval** — the agent writes a proposal note and escalates high
  severity, but **never** resolves; a human acts in `/admin/ai-review`.
- **Idempotency** — each answer is stamped `agentTriagedAt`, so it's processed once.

## Metrics + eval

- Every run is stored in `AgentRun` (counts + durationMs). The dashboard shows a
  **before/after** metric: configured manual baseline (sec/answer) vs the agent's
  measured throughput, and the hours saved.
- **Agent eval**: `evals/datasets/triage.jsonl` + a `triageAccuracy` scorer in
  `evals/run.ts` (category-classification accuracy, LLM path). It's part of the
  eval suite the CI gate runs (`.github/workflows/evals.yml` covers `src/lib/ai/**`,
  `src/lib/agent/**`, `evals/**`).

## Rollback / safety

Flip the kill switch off (`/admin/ai-agent` → Disable) to stop the agent
immediately; in-flight Inngest runs finish their current step and stop. Nothing
the agent does is user-visible — it only annotates the internal review queue.
