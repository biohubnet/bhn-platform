-- Adaptive learning MVP — three small additions.
--
--   1. Question.topic — free-text topic label so the mastery heatmap
--      can group answers by topic. No separate KC ontology yet; this
--      is the "cheap topic-level proportion correct" path that we
--      can upgrade to BKT/KC later if usage warrants.
--   2. ReviewBookmark — trainee-bookmarked questions with simple
--      expanding-interval scheduling (1d → 3d → 7d → 14d → 30d).
--   3. ModuleCheckpoint — author-placed timestamps in a video module
--      that pause playback and show a comprehension question.

-- 1. Question topic tag
ALTER TABLE "Question"
  ADD COLUMN "topic" TEXT;

-- 2. ReviewBookmark
CREATE TABLE "ReviewBookmark" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "questionId"     TEXT NOT NULL,
  "intervalDays"   INTEGER NOT NULL DEFAULT 1,
  "nextReviewAt"   TIMESTAMP(3) NOT NULL,
  "lastReviewedAt" TIMESTAMP(3),
  "lastQuality"    INTEGER, -- 0 = "still tricky", 1 = "got it"
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReviewBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewBookmark_userId_questionId_key"
  ON "ReviewBookmark"("userId", "questionId");

CREATE INDEX "ReviewBookmark_userId_nextReviewAt_idx"
  ON "ReviewBookmark"("userId", "nextReviewAt");

ALTER TABLE "ReviewBookmark"
  ADD CONSTRAINT "ReviewBookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "ReviewBookmark"
  ADD CONSTRAINT "ReviewBookmark_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE;

-- 3. ModuleCheckpoint
CREATE TABLE "ModuleCheckpoint" (
  "id"               TEXT NOT NULL,
  "moduleId"         TEXT NOT NULL,
  "timestampSeconds" DOUBLE PRECISION NOT NULL,
  "questionId"       TEXT,
  "orderIndex"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModuleCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModuleCheckpoint_moduleId_orderIndex_idx"
  ON "ModuleCheckpoint"("moduleId", "orderIndex");

ALTER TABLE "ModuleCheckpoint"
  ADD CONSTRAINT "ModuleCheckpoint_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE;

ALTER TABLE "ModuleCheckpoint"
  ADD CONSTRAINT "ModuleCheckpoint_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL;
