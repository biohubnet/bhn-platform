-- Three coordinated additions in service of the talent-pool
-- collaboration + feedback features:
--
-- 1. EventFormSubmission gets leftPoolAt / leftPoolReason so an
--    approved applicant can voluntarily withdraw from the
--    employer-visible directory. Hidden from employer-facing
--    views as long as leftPoolAt is set; re-submission can clear
--    it.
--
-- 2. ApplicationComment — admin- or employer-authored thread on a
--    talent-application submission. The write path is gated
--    server-side behind reviewStatus reaching "approved" (or
--    "approved_skip_review") so employers can't advance a
--    candidate before the eligibility check passes.
--
-- 3. PoolExitFeedback — one-shot exit survey row tied to the
--    submission. Captures NPS, four 1-10 scales (helpfulness,
--    partnerQuality, platformExperience, communicationFreq), three
--    free-text fields, an allowFollowUp consent, and a
--    found-a-job hint. Unique-per-submission so a re-leave
--    overwrites rather than accumulating.
--
-- 4. FeedbackInvitation — admin can mint a one-shot link inviting
--    any user to fill the exit / NPS survey out of band; the
--    leave-pool flow also auto-issues one so a user who skipped
--    the survey at the time can come back later.
--
-- Backfill: none required. leftPoolAt defaults NULL so every
-- existing approved submission stays in the pool by default.

-- ─── EventFormSubmission additions ─────────────────────────────

ALTER TABLE "EventFormSubmission"
  ADD COLUMN "leftPoolAt"     TIMESTAMP(3),
  ADD COLUMN "leftPoolReason" TEXT;

CREATE INDEX "EventFormSubmission_formId_reviewStatus_leftPoolAt_idx"
  ON "EventFormSubmission"("formId", "reviewStatus", "leftPoolAt");

-- ─── ApplicationComment ────────────────────────────────────────

CREATE TABLE "ApplicationComment" (
  "id"           TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "authorId"     TEXT NOT NULL,
  "authorRole"   TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationComment_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "EventFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ApplicationComment_submissionId_createdAt_idx"
  ON "ApplicationComment"("submissionId", "createdAt");

CREATE INDEX "ApplicationComment_authorId_createdAt_idx"
  ON "ApplicationComment"("authorId", "createdAt");

-- ─── PoolExitFeedback ──────────────────────────────────────────

CREATE TABLE "PoolExitFeedback" (
  "id"                  TEXT NOT NULL,
  "submissionId"        TEXT NOT NULL,
  "userId"              TEXT NOT NULL,
  "reason"              TEXT NOT NULL,
  "helpfulness"         INTEGER,
  "partnerQuality"      INTEGER,
  "platformExperience"  INTEGER,
  "communicationFreq"   INTEGER,
  "npsScore"            INTEGER,
  "foundJob"            BOOLEAN NOT NULL DEFAULT false,
  "jobSource"           TEXT,
  "whatWorkedWell"      TEXT,
  "whatToImprove"       TEXT,
  "additionalComments"  TEXT,
  "allowFollowUp"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PoolExitFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PoolExitFeedback_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "EventFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PoolExitFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PoolExitFeedback_submissionId_key"
  ON "PoolExitFeedback"("submissionId");

CREATE INDEX "PoolExitFeedback_createdAt_idx"
  ON "PoolExitFeedback"("createdAt");

CREATE INDEX "PoolExitFeedback_reason_createdAt_idx"
  ON "PoolExitFeedback"("reason", "createdAt");

-- ─── FeedbackInvitation ────────────────────────────────────────

CREATE TABLE "FeedbackInvitation" (
  "id"          TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "userId"      TEXT,
  "invitedById" TEXT,
  "kind"        TEXT NOT NULL DEFAULT 'exit_survey',
  "message"     TEXT,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "consumedAt"  TIMESTAMP(3),
  "feedbackId"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeedbackInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeedbackInvitation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FeedbackInvitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FeedbackInvitation_token_key"
  ON "FeedbackInvitation"("token");

CREATE INDEX "FeedbackInvitation_invitedById_createdAt_idx"
  ON "FeedbackInvitation"("invitedById", "createdAt");

CREATE INDEX "FeedbackInvitation_token_expiresAt_idx"
  ON "FeedbackInvitation"("token", "expiresAt");
