-- Structured resume + comments + revisions.
-- The uploaded blob (User.resumeUrl) stays as the archival source;
-- this migration adds the AI-parsed structured representation that
-- mentors / instructors / admins / employers can comment on.

CREATE TABLE "Resume" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "sourceFileUrl" TEXT,
  "parsedAt"      TIMESTAMP(3),
  "lastEditedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version"       INTEGER NOT NULL DEFAULT 1,
  "content"       JSONB NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Resume_userId_key" ON "Resume" ("userId");
CREATE INDEX        "Resume_userId_idx" ON "Resume" ("userId");

ALTER TABLE "Resume"
  ADD CONSTRAINT "Resume_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResumeComment" (
  "id"              TEXT NOT NULL,
  "resumeId"        TEXT NOT NULL,
  "authorId"        TEXT NOT NULL,
  "authorRole"      TEXT NOT NULL,
  "anchorBulletId"  TEXT,
  "anchorItemId"    TEXT,
  "anchorSectionId" TEXT,
  "body"            TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'open',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResumeComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeComment_resumeId_createdAt_idx" ON "ResumeComment" ("resumeId", "createdAt");
CREATE INDEX "ResumeComment_authorId_idx"           ON "ResumeComment" ("authorId");

ALTER TABLE "ResumeComment"
  ADD CONSTRAINT "ResumeComment_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeComment"
  ADD CONSTRAINT "ResumeComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResumeRevision" (
  "id"           TEXT NOT NULL,
  "resumeId"     TEXT NOT NULL,
  "version"      INTEGER NOT NULL,
  "content"      JSONB NOT NULL,
  "triggeredBy"  TEXT NOT NULL,
  "note"         TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResumeRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeRevision_resumeId_version_idx" ON "ResumeRevision" ("resumeId", "version");

ALTER TABLE "ResumeRevision"
  ADD CONSTRAINT "ResumeRevision_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
