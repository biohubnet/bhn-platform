-- Idempotency marker: when the triage agent processed a flagged AI answer.
ALTER TABLE "AIInteraction" ADD COLUMN "agentTriagedAt" TIMESTAMP(3);

-- Autonomous triage-agent run history (powers the agent dashboard + the
-- before/after throughput metric).
CREATE TABLE "AgentRun" (
    "id"             TEXT         NOT NULL,
    "agent"          TEXT         NOT NULL DEFAULT 'triage',
    "trigger"        TEXT         NOT NULL DEFAULT 'schedule',
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"     TIMESTAMP(3),
    "itemsProcessed" INTEGER      NOT NULL DEFAULT 0,
    "itemsProposed"  INTEGER      NOT NULL DEFAULT 0,
    "durationMs"     INTEGER,
    "ok"             BOOLEAN      NOT NULL DEFAULT true,
    "summary"        TEXT         NOT NULL DEFAULT '',
    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgentRun_startedAt_idx" ON "AgentRun" ("startedAt");
