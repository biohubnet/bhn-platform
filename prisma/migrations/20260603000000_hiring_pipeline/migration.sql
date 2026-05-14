-- Hiring pipeline — end-to-end Applied → Hired flow.
--
-- Three shapes ship together:
--
--   1. ApplicationStatus gains stage-tracking + reason columns
--        • stageEnteredAt  — when the current status was set
--        • rejectionReason — visible to trainee on rejection emails
--        • employerNote    — internal-only deliberation note
--
--   2. NEW Offer table — the missing endpoint of the pipeline.
--      One row per ApplicationStatus that's reached the offer stage.
--      Acceptance links to ElectronicSignature via signatureId.
--
--   3. NEW InterviewScore table — multi-stakeholder rubric scoring
--      for the Interview model. (interviewId, scorerUserId) is unique
--      so each interviewer gets exactly one row per interview.

-- ── 1. ApplicationStatus columns ──────────────────────────────
ALTER TABLE "ApplicationStatus"
  ADD COLUMN "stageEnteredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "employerNote"    TEXT;

-- Backfill stageEnteredAt for existing rows so the column has
-- meaningful data immediately. updatedAt is the closest proxy.
UPDATE "ApplicationStatus" SET "stageEnteredAt" = "updatedAt";

-- New composite index supports the pipeline-analytics
-- "time-in-stage per posting" query.
CREATE INDEX "ApplicationStatus_postingId_status_stageEnteredAt_idx"
  ON "ApplicationStatus"("postingId", "status", "stageEnteredAt");

-- ── 2. Offer ──────────────────────────────────────────────────
CREATE TABLE "Offer" (
  "id"                  TEXT PRIMARY KEY,
  "applicationStatusId" TEXT NOT NULL,
  "postingId"           TEXT NOT NULL,
  "applicantId"         TEXT NOT NULL,
  "createdById"         TEXT,
  "status"              TEXT NOT NULL DEFAULT 'draft',
  "templateKey"         TEXT,
  "body"                TEXT NOT NULL,
  "compensation"        TEXT,
  "startDate"           TIMESTAMP(3),
  "endDate"             TIMESTAMP(3),
  "hoursPerWeek"        TEXT,
  "location"            TEXT,
  "acceptDeadline"      TIMESTAMP(3),
  "sentAt"              TIMESTAMP(3),
  "respondedAt"         TIMESTAMP(3),
  "declineReason"       TEXT,
  "signatureId"         TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Offer_applicationStatusId_key" ON "Offer"("applicationStatusId");
CREATE INDEX "Offer_applicantId_status_idx" ON "Offer"("applicantId", "status");
CREATE INDEX "Offer_postingId_status_idx" ON "Offer"("postingId", "status");

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_applicationStatusId_fkey"
    FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_postingId_fkey"
    FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. InterviewScore ─────────────────────────────────────────
CREATE TABLE "InterviewScore" (
  "id"             TEXT PRIMARY KEY,
  "interviewId"    TEXT NOT NULL,
  "scorerUserId"   TEXT NOT NULL,
  "overallScore"   INTEGER NOT NULL,
  "skillScores"    JSONB,
  "recommendation" TEXT NOT NULL,
  "strengths"      TEXT,
  "concerns"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "InterviewScore_interviewId_scorerUserId_key"
  ON "InterviewScore"("interviewId", "scorerUserId");
CREATE INDEX "InterviewScore_interviewId_idx" ON "InterviewScore"("interviewId");

ALTER TABLE "InterviewScore"
  ADD CONSTRAINT "InterviewScore_interviewId_fkey"
    FOREIGN KEY ("interviewId") REFERENCES "Interview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewScore"
  ADD CONSTRAINT "InterviewScore_scorerUserId_fkey"
    FOREIGN KEY ("scorerUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
