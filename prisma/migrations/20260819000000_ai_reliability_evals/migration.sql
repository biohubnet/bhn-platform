-- Reliability telemetry: cost, prompt version, and structured-output validation
-- result on the AI call log (AIInteraction).
ALTER TABLE "AIInteraction" ADD COLUMN "costUsd"          DOUBLE PRECISION;
ALTER TABLE "AIInteraction" ADD COLUMN "promptVersion"    TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN "validationPassed" BOOLEAN;

-- Offline eval-run history (evals/run.ts) — trend tracking + CI baseline compare.
CREATE TABLE "EvalRun" (
    "id"        TEXT         NOT NULL,
    "commitSha" TEXT,
    "trigger"   TEXT         NOT NULL DEFAULT 'local',
    "scores"    JSONB        NOT NULL,
    "passed"    BOOLEAN      NOT NULL DEFAULT true,
    "summary"   TEXT         NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvalRun_createdAt_idx" ON "EvalRun" ("createdAt");
