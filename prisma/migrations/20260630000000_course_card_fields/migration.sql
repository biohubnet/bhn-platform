-- Course catalog card fields — adds four optional columns to
-- `Course` that drive the new catalog card layout (mirrors the
-- legacy course-card design the user shared as reference).
--
--   code             — short course code shown on the card eyebrow
--                      (e.g. "BIOP210", "ACRTM101")
--   enrollByDate     — enrollment-deadline date for cohort-based
--                      courses ("Enroll by: Jun 30, 2025")
--   cohortStartDate  — cohort start date (In-Person / Hybrid)
--   cohortEndDate    — cohort end date (In-Person / Hybrid)
--
-- All four are nullable so existing courses keep rendering without
-- these fields populated; admins fill them in from the QuickEdit
-- dialog on /courses.

ALTER TABLE "Course"
  ADD COLUMN "code"            TEXT,
  ADD COLUMN "enrollByDate"    TIMESTAMP(3),
  ADD COLUMN "cohortStartDate" TIMESTAMP(3),
  ADD COLUMN "cohortEndDate"   TIMESTAMP(3);

-- Filter index on code so the catalog search can match by code
-- cheaply (admins enter "BIOP210" and the catalog narrows).
CREATE INDEX "Course_code_idx" ON "Course"("code");
