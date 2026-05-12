-- Three threads in one migration:
--
-- 1. PathwayCohort
--    New model for cohort-level enrollment management within a
--    pathway. Each cohort owns its own capacity, waitlist policy,
--    and registration window. Pathway-level enrollment fields stay
--    intact as the fallback when a pathway has zero cohorts.
--
-- 2. PathwayEnrollment.cohortId + waitlistPosition
--    Optional FK so existing enrollments stay valid (cohortId NULL).
--    waitlistPosition tracks queue position when status="waitlisted",
--    densely renumbered on earlier waitlister cancellation. The
--    composite (userId, pathwayId) unique key is preserved — a user
--    has at most one enrollment per pathway regardless of cohort.
--
-- 3. EventFormSubmission review fields
--    reviewStatus / reviewedBy / reviewedAt / reviewerNote gate the
--    talent-application form behind admin review before submissions
--    appear in the talent pool. Other form slugs ignore the field.
--    Default "pending" — backfilled below to "approved" for existing
--    rows so we don't suddenly hide submissions that were already in
--    the pool under the old (no-review) regime.
--
-- ─────────────────────────────────────────────────────────────────

-- 1. PathwayCohort table.

CREATE TABLE "PathwayCohort" (
  "id"                 TEXT NOT NULL,
  "pathwayId"          TEXT NOT NULL,
  "slug"               TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "description"        TEXT,
  "startDate"          TIMESTAMP(3) NOT NULL,
  "endDate"            TIMESTAMP(3),
  "capacity"           INTEGER NOT NULL,
  "allowWaitlist"      BOOLEAN NOT NULL DEFAULT true,
  "waitlistCapacity"   INTEGER,
  "enrollmentOpensAt"  TIMESTAMP(3),
  "enrollmentClosesAt" TIMESTAMP(3),
  "status"             TEXT NOT NULL DEFAULT 'draft',
  "displayOrder"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PathwayCohort_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "PathwayCohort_pathwayId_fkey"
    FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PathwayCohort_pathwayId_slug_key"
  ON "PathwayCohort"("pathwayId", "slug");

CREATE INDEX "PathwayCohort_pathwayId_displayOrder_idx"
  ON "PathwayCohort"("pathwayId", "displayOrder");

-- 2. PathwayEnrollment additions.

ALTER TABLE "PathwayEnrollment"
  ADD COLUMN "cohortId"         TEXT,
  ADD COLUMN "waitlistPosition" INTEGER;

ALTER TABLE "PathwayEnrollment"
  ADD CONSTRAINT "PathwayEnrollment_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PathwayEnrollment_cohortId_status_waitlistPosition_idx"
  ON "PathwayEnrollment"("cohortId", "status", "waitlistPosition");

-- 3. EventFormSubmission review fields.

ALTER TABLE "EventFormSubmission"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewedBy"   TEXT,
  ADD COLUMN "reviewedAt"   TIMESTAMP(3),
  ADD COLUMN "reviewerNote" TEXT;

-- Backfill: existing submissions are grandfathered into the pool.
-- Without this, every pre-existing submission would vanish from
-- talent-pool views the moment we ship the gating logic. Affected
-- count is small (early-stage platform) so this is fast.
UPDATE "EventFormSubmission"
SET    "reviewStatus" = 'approved'
WHERE  "reviewStatus" = 'pending';

CREATE INDEX "EventFormSubmission_formId_reviewStatus_createdAt_idx"
  ON "EventFormSubmission"("formId", "reviewStatus", "createdAt");
