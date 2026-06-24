-- AI Job-Tailoring module — Phase 1: grounded career facts + the tailoring loop.
-- All additive (new columns are nullable; new tables are empty).

-- 1) Structured career-fact fields on the master bullet library so every
--    claim is auditable and the drafter never invents a metric (rule 1).
ALTER TABLE "MasterBullet" ADD COLUMN "metric"            TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "mechanism"         TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "canonicalPhrasing" TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "confidence"        DOUBLE PRECISION;
ALTER TABLE "MasterBullet" ADD COLUMN "sourceNote"        TEXT;

-- 2) External job being tailored to (distinct from InternshipPosting).
CREATE TABLE "TailoringJob" (
    "id"               TEXT         NOT NULL,
    "userId"           TEXT         NOT NULL,
    "url"              TEXT,
    "ats"              TEXT,
    "title"            TEXT         NOT NULL,
    "company"          TEXT         NOT NULL,
    "location"         TEXT,
    "comp"             TEXT,
    "mustHaves"        TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "niceToHaves"      TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rawJD"            TEXT         NOT NULL DEFAULT '',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TailoringJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TailoringJob_userId_createdAt_idx" ON "TailoringJob" ("userId", "createdAt");
ALTER TABLE "TailoringJob" ADD CONSTRAINT "TailoringJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) A tailoring attempt: generated docs + QA report + fit-check. Never auto-submitted.
CREATE TABLE "TailoringRun" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "jobId"      TEXT         NOT NULL,
    "resumeId"   TEXT,
    "resumeDoc"  TEXT,
    "coverDoc"   TEXT,
    "format"     TEXT,
    "fitCheck"   JSONB,
    "qaReport"   JSONB,
    "status"     TEXT         NOT NULL DEFAULT 'pending',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "TailoringRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TailoringRun_userId_createdAt_idx" ON "TailoringRun" ("userId", "createdAt");
CREATE INDEX "TailoringRun_jobId_idx" ON "TailoringRun" ("jobId");
ALTER TABLE "TailoringRun" ADD CONSTRAINT "TailoringRun_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TailoringRun" ADD CONSTRAINT "TailoringRun_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "TailoringJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Learning-loop rule: a codified correction/preference applied on future runs.
CREATE TABLE "TailoringRule" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT,
    "scope"      TEXT         NOT NULL DEFAULT 'global',
    "trigger"    TEXT         NOT NULL DEFAULT '*',
    "ruleText"   TEXT         NOT NULL,
    "isActive"   BOOLEAN      NOT NULL DEFAULT true,
    "codifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TailoringRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TailoringRule_userId_scope_isActive_idx" ON "TailoringRule" ("userId", "scope", "isActive");
ALTER TABLE "TailoringRule" ADD CONSTRAINT "TailoringRule_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) A single correction on a run's output; feeds the rule engine.
CREATE TABLE "TailoringCorrection" (
    "id"        TEXT         NOT NULL,
    "runId"     TEXT         NOT NULL,
    "before"    TEXT         NOT NULL DEFAULT '',
    "after"     TEXT         NOT NULL DEFAULT '',
    "ruleId"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TailoringCorrection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TailoringCorrection_runId_idx" ON "TailoringCorrection" ("runId");
ALTER TABLE "TailoringCorrection" ADD CONSTRAINT "TailoringCorrection_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "TailoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TailoringCorrection" ADD CONSTRAINT "TailoringCorrection_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "TailoringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
