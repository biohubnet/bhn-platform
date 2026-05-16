-- HQP feedback rounds. An admin creates a round with N topics;
-- every active HQP committee member fills in one response per
-- topic. Replaces the email-the-docx workflow.

CREATE TABLE "HqpFeedbackRound" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "topics"      JSONB NOT NULL DEFAULT '[]',
  "opensAt"     TIMESTAMP(3) NOT NULL,
  "closesAt"    TIMESTAMP(3) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'open',
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "HqpFeedbackRound_status_opensAt_closesAt_idx"
  ON "HqpFeedbackRound"("status", "opensAt", "closesAt");

ALTER TABLE "HqpFeedbackRound"
  ADD CONSTRAINT "HqpFeedbackRound_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HqpFeedbackResponse" (
  "id"          TEXT PRIMARY KEY,
  "roundId"     TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "answers"     JSONB NOT NULL DEFAULT '{}',
  "status"      TEXT NOT NULL DEFAULT 'draft',
  "submittedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "HqpFeedbackResponse_roundId_userId_key"
  ON "HqpFeedbackResponse"("roundId", "userId");
CREATE INDEX "HqpFeedbackResponse_roundId_status_idx"
  ON "HqpFeedbackResponse"("roundId", "status");
CREATE INDEX "HqpFeedbackResponse_userId_idx"
  ON "HqpFeedbackResponse"("userId");

ALTER TABLE "HqpFeedbackResponse"
  ADD CONSTRAINT "HqpFeedbackResponse_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "HqpFeedbackRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HqpFeedbackResponse"
  ADD CONSTRAINT "HqpFeedbackResponse_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
