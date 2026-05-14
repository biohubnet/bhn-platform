-- Application-prep coaching surface.
--
-- Three new tables back the multi-step coach at
-- /internships/[id]/prepare and the reusable Story Bank at
-- /profile/stories:
--
--   1. PrepSession    — one row per (user, posting). Holds the
--                       user's progress through the 4-step coach
--                       (compare → gaps → interview → star) and a
--                       JSON state blob keyed by step.
--   2. StarStory      — reusable STAR-format story authored by a
--                       trainee. Lives at the user level, not the
--                       session level, so it can be referenced from
--                       multiple postings.
--   3. StarStorySkill — many-to-many between StarStory and Skill;
--                       drives the "you have a story for this skill"
--                       hint in the coach.
--
-- Forward-only migration. No backfill needed — tables start empty.

CREATE TABLE "PrepSession" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "postingId"   TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "state"       JSONB NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "PrepSession_userId_postingId_key"
  ON "PrepSession"("userId", "postingId");
CREATE INDEX "PrepSession_userId_updatedAt_idx"
  ON "PrepSession"("userId", "updatedAt");
CREATE INDEX "PrepSession_postingId_idx"
  ON "PrepSession"("postingId");

ALTER TABLE "PrepSession"
  ADD CONSTRAINT "PrepSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrepSession"
  ADD CONSTRAINT "PrepSession_postingId_fkey"
    FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StarStory" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "situation"       TEXT NOT NULL,
  "task"            TEXT NOT NULL,
  "action"          TEXT NOT NULL,
  "result"          TEXT NOT NULL,
  "tags"            TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  "aiHistory"       JSONB,
  "sourcePostingId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE INDEX "StarStory_userId_updatedAt_idx"
  ON "StarStory"("userId", "updatedAt");

ALTER TABLE "StarStory"
  ADD CONSTRAINT "StarStory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StarStory"
  ADD CONSTRAINT "StarStory_sourcePostingId_fkey"
    FOREIGN KEY ("sourcePostingId") REFERENCES "InternshipPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StarStorySkill" (
  "storyId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  PRIMARY KEY ("storyId", "skillId")
);

CREATE INDEX "StarStorySkill_skillId_idx"
  ON "StarStorySkill"("skillId");

ALTER TABLE "StarStorySkill"
  ADD CONSTRAINT "StarStorySkill_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "StarStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StarStorySkill"
  ADD CONSTRAINT "StarStorySkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
