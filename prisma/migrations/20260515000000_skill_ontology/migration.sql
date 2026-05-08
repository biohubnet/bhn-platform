-- Skill ontology — the keystone of the matching platform.
--
-- Every Skill has a canonical name and a 384-d BGE embedding so we can
-- detect synonyms ("USP" vs "Upstream Processing") without manual work.
-- Courses, postings, and trainee profiles reference Skills by FK,
-- never by free text.

CREATE TABLE "Skill" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL UNIQUE,
  "slug"        TEXT NOT NULL UNIQUE,
  "category"    TEXT,
  "description" TEXT,
  -- 384-d BGE-small embedding; populated via lib/skills/ontology.ts
  "embedding"   vector(384),
  -- "active" | "deprecated" | "merged"  (when merged, mergedIntoId points to survivor)
  "status"      TEXT NOT NULL DEFAULT 'active',
  "mergedIntoId" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Skill_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId")
    REFERENCES "Skill"("id") ON DELETE SET NULL
);
CREATE INDEX "Skill_status_idx" ON "Skill"("status");
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- Aliases — every spelling/variation that should resolve to one Skill.
-- Stored lowercased for fast lookup.
CREATE TABLE "SkillAlias" (
  "id"        TEXT PRIMARY KEY,
  "skillId"   TEXT NOT NULL,
  "alias"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkillAlias_skillId_fkey" FOREIGN KEY ("skillId")
    REFERENCES "Skill"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "SkillAlias_alias_key" ON "SkillAlias"("alias");
CREATE INDEX "SkillAlias_skillId_idx" ON "SkillAlias"("skillId");

-- Course → Skill many-to-many. Weight is 0..1 for "how core is this
-- skill to the course"; source tracks where the tag came from so we
-- never clobber admin-curated rows on AI re-extraction.
CREATE TABLE "CourseSkill" (
  "id"         TEXT PRIMARY KEY,
  "courseId"   TEXT NOT NULL,
  "skillId"    TEXT NOT NULL,
  "weight"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source"     TEXT NOT NULL DEFAULT 'ai',  -- ai | admin | seed
  "confidence" DOUBLE PRECISION,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseSkill_courseId_fkey" FOREIGN KEY ("courseId")
    REFERENCES "Course"("id") ON DELETE CASCADE,
  CONSTRAINT "CourseSkill_skillId_fkey" FOREIGN KEY ("skillId")
    REFERENCES "Skill"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "CourseSkill_courseId_skillId_key" ON "CourseSkill"("courseId","skillId");
CREATE INDEX "CourseSkill_skillId_idx" ON "CourseSkill"("skillId");

-- User → Skill. level: 0..1; source distinguishes self-claimed from
-- AI-extracted-from-resume from inferred-from-course-completion.
CREATE TABLE "UserSkill" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "skillId"   TEXT NOT NULL,
  "level"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source"    TEXT NOT NULL DEFAULT 'inferred',  -- self | resume | ai | inferred | admin
  "evidence"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId")
    REFERENCES "Skill"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId","skillId");
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- Posting → Skill. required = "must have" vs "nice to have"; weight is
-- the relative importance among required skills (sum can exceed 1).
CREATE TABLE "PostingSkill" (
  "id"         TEXT PRIMARY KEY,
  "postingId"  TEXT NOT NULL,
  "skillId"    TEXT NOT NULL,
  "weight"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "required"   BOOLEAN NOT NULL DEFAULT true,
  "source"     TEXT NOT NULL DEFAULT 'ai',  -- ai | admin | employer
  "confidence" DOUBLE PRECISION,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostingSkill_postingId_fkey" FOREIGN KEY ("postingId")
    REFERENCES "InternshipPosting"("id") ON DELETE CASCADE,
  CONSTRAINT "PostingSkill_skillId_fkey" FOREIGN KEY ("skillId")
    REFERENCES "Skill"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PostingSkill_postingId_skillId_key" ON "PostingSkill"("postingId","skillId");
CREATE INDEX "PostingSkill_skillId_idx" ON "PostingSkill"("skillId");

-- HNSW index for fast nearest-neighbour over the skill space.
CREATE INDEX "Skill_embedding_hnsw_idx" ON "Skill"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Phase 4 additions: applicant kanban + interview scheduling ─────
-- Single source of truth for an application's workflow status. The row
-- exists once per (postingId, applicantId) pair; statuses are stamped
-- by the employer as the applicant moves through the funnel.
CREATE TABLE "ApplicationStatus" (
  "id"          TEXT PRIMARY KEY,
  "postingId"   TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'new',  -- new | reviewing | shortlisted | phone_screen | onsite | offer | hired | rejected | closed
  "notes"       TEXT,
  "rating"      INTEGER,                       -- 1..5 employer rating
  "updatedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStatus_postingId_fkey" FOREIGN KEY ("postingId")
    REFERENCES "InternshipPosting"("id") ON DELETE CASCADE,
  CONSTRAINT "ApplicationStatus_applicantId_fkey" FOREIGN KEY ("applicantId")
    REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ApplicationStatus_updatedById_fkey" FOREIGN KEY ("updatedById")
    REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "ApplicationStatus_postingId_applicantId_key"
  ON "ApplicationStatus"("postingId","applicantId");
CREATE INDEX "ApplicationStatus_status_idx" ON "ApplicationStatus"("status");

CREATE TABLE "Interview" (
  "id"             TEXT PRIMARY KEY,
  "postingId"      TEXT NOT NULL,
  "applicantId"    TEXT NOT NULL,
  "scheduledById"  TEXT NOT NULL,
  -- JSON array of ISO datetime strings the employer proposed
  "proposedSlots"  JSONB NOT NULL,
  "acceptedSlot"   TIMESTAMP(3),
  -- "proposed" | "accepted" | "declined" | "completed" | "cancelled"
  "status"         TEXT NOT NULL DEFAULT 'proposed',
  "format"         TEXT,                 -- "phone" | "video" | "onsite"
  "location"       TEXT,                 -- meeting URL or address
  "notes"          TEXT,
  "respondedAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Interview_postingId_fkey" FOREIGN KEY ("postingId")
    REFERENCES "InternshipPosting"("id") ON DELETE CASCADE,
  CONSTRAINT "Interview_applicantId_fkey" FOREIGN KEY ("applicantId")
    REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Interview_scheduledById_fkey" FOREIGN KEY ("scheduledById")
    REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Interview_postingId_idx" ON "Interview"("postingId");
CREATE INDEX "Interview_applicantId_idx" ON "Interview"("applicantId");
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- Phase 6 — extend EmployerInvite with a demo-mode flag so admins can
-- mint a 7-day read-only viewer token for prospective partners.
ALTER TABLE "EmployerInvite"
  ADD COLUMN "demoMode" BOOLEAN NOT NULL DEFAULT false;

-- Phase 6 — public access-request inbox. The /for-employers and
-- /for-trainees marketing pages let visitors leave their email; admins
-- triage from /admin/access-requests and approve into an EmployerInvite
-- (or a regular trainee account welcome).
CREATE TABLE "AccessRequest" (
  "id"        TEXT PRIMARY KEY,
  "kind"      TEXT NOT NULL,   -- "employer" | "trainee"
  "email"     TEXT NOT NULL,
  "name"      TEXT,
  "company"   TEXT,
  "website"   TEXT,
  "message"   TEXT,
  "source"    TEXT NOT NULL DEFAULT 'for-employers',
  "status"    TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  "handledAt" TIMESTAMP(3),
  "handledById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessRequest_handledById_fkey" FOREIGN KEY ("handledById")
    REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");
CREATE INDEX "AccessRequest_kind_idx" ON "AccessRequest"("kind");
