-- Per-application "job folder" bundles — one row per role the user
-- is pursuing. Wraps a JD snippet, cover letter, interview prep,
-- and optional links to a Resume + an InternshipPosting on this
-- platform. See JobFolder model in prisma/schema.prisma.

CREATE TABLE IF NOT EXISTS "JobFolder" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "jdSnippet"     TEXT NOT NULL DEFAULT '',
  "postingId"     TEXT,
  "resumeId"     TEXT,
  "coverLetter"   TEXT NOT NULL DEFAULT '',
  "interviewPrep" TEXT NOT NULL DEFAULT '',
  "status"        TEXT NOT NULL DEFAULT 'drafting',
  "isArchived"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobFolder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobFolder_userId_isArchived_idx"
  ON "JobFolder" ("userId", "isArchived");
CREATE INDEX IF NOT EXISTS "JobFolder_resumeId_idx"
  ON "JobFolder" ("resumeId");

ALTER TABLE "JobFolder"
  ADD CONSTRAINT "JobFolder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobFolder"
  ADD CONSTRAINT "JobFolder_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
