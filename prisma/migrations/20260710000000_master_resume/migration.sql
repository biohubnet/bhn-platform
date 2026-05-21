-- Master resume system — four new tables.
--
-- Singleton MasterResume per user. Owns many MasterBullet rows
-- (the library). Each bullet has its own revision history
-- (MasterBulletRevision) and the master itself supports named
-- snapshots (MasterSnapshot) that lock + version the state for
-- download. pgvector embedding lives on each bullet for AI
-- retrieval — same column type the Skill + PostingSkill tables
-- use elsewhere in the schema.
--
-- See docs/plans/master-resume.md for the architecture + five
-- principles + API surface.

-- 1. MasterResume — one per user.
CREATE TABLE "MasterResume" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "header"    JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MasterResume_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterResume_userId_key" ON "MasterResume" ("userId");

ALTER TABLE "MasterResume"
  ADD CONSTRAINT "MasterResume_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. MasterBullet — the library bullets.
CREATE TABLE "MasterBullet" (
  "id"               TEXT NOT NULL,
  "masterId"         TEXT NOT NULL,
  "sectionKind"      TEXT NOT NULL,
  "anchorTitle"      TEXT,
  "anchorSubtitle"   TEXT,
  "anchorDateRange"  TEXT,
  "body"             TEXT NOT NULL,
  "tags"             TEXT[] NOT NULL DEFAULT '{}',
  "sourceResumeId"   TEXT,
  "position"         INTEGER NOT NULL DEFAULT 0,
  "isArchived"       BOOLEAN NOT NULL DEFAULT false,
  "embedding"        vector(384),
  "embeddingText"    TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MasterBullet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterBullet_masterId_sectionKind_isArchived_idx"
  ON "MasterBullet" ("masterId", "sectionKind", "isArchived");
CREATE INDEX "MasterBullet_masterId_anchorTitle_idx"
  ON "MasterBullet" ("masterId", "anchorTitle");

ALTER TABLE "MasterBullet"
  ADD CONSTRAINT "MasterBullet_masterId_fkey"
  FOREIGN KEY ("masterId") REFERENCES "MasterResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. MasterBulletRevision — per-bullet history.
CREATE TABLE "MasterBulletRevision" (
  "id"        TEXT NOT NULL,
  "bulletId"  TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "tags"      TEXT[] NOT NULL DEFAULT '{}',
  "source"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MasterBulletRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterBulletRevision_bulletId_createdAt_idx"
  ON "MasterBulletRevision" ("bulletId", "createdAt");

ALTER TABLE "MasterBulletRevision"
  ADD CONSTRAINT "MasterBulletRevision_bulletId_fkey"
  FOREIGN KEY ("bulletId") REFERENCES "MasterBullet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. MasterSnapshot — named, versioned, immutable.
CREATE TABLE "MasterSnapshot" (
  "id"            TEXT NOT NULL,
  "masterId"      TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "name"          TEXT NOT NULL,
  "content"       JSONB NOT NULL,
  "pdfUrl"        TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MasterSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterSnapshot_masterId_versionNumber_key"
  ON "MasterSnapshot" ("masterId", "versionNumber");
CREATE INDEX "MasterSnapshot_masterId_createdAt_idx"
  ON "MasterSnapshot" ("masterId", "createdAt");

ALTER TABLE "MasterSnapshot"
  ADD CONSTRAINT "MasterSnapshot_masterId_fkey"
  FOREIGN KEY ("masterId") REFERENCES "MasterResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
