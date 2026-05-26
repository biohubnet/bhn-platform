-- ShowcaseSubmission — public submission for the "graduate showcase"
-- pages (no login required). Each row is one alumnus' name +
-- LinkedIn handle + R2-hosted headshot, scoped to a program slug.
-- Admins triage via /admin/showcase: download, mark when last
-- downloaded, or delete.

CREATE TABLE "ShowcaseSubmission" (
  "id"                TEXT NOT NULL,
  "programSlug"       TEXT NOT NULL DEFAULT 'regulatory-affairs',
  "name"              TEXT NOT NULL,
  "linkedinHandle"    TEXT NOT NULL,
  "linkedinUrl"       TEXT,
  "photoUrl"          TEXT NOT NULL,
  "photoKey"          TEXT NOT NULL,
  "submittedFromIp"   TEXT,
  "submittedFromUa"   TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDownloadedAt"  TIMESTAMP(3),
  "lastDownloadedBy"  TEXT,
  "adminNote"         TEXT,
  CONSTRAINT "ShowcaseSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShowcaseSubmission_programSlug_createdAt_idx"
  ON "ShowcaseSubmission"("programSlug", "createdAt");
