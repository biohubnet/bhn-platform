-- Register -> Attend -> Showcase chain.
-- Additive only: attendance on PathwayEnrollment, links from the showcase
-- layer to the real learning-pathway registration, and a userId stamp on
-- gated submissions. Nothing here changes existing rows' behaviour.

-- 1. Attendance (enrollment-level) on PathwayEnrollment.
ALTER TABLE "PathwayEnrollment" ADD COLUMN "attended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PathwayEnrollment" ADD COLUMN "sessionsAttended" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PathwayEnrollment" ADD COLUMN "attendanceNote" TEXT;
ALTER TABLE "PathwayEnrollment" ADD COLUMN "attendanceRecordedAt" TIMESTAMP(3);
ALTER TABLE "PathwayEnrollment" ADD COLUMN "attendanceRecordedById" TEXT;
CREATE INDEX "PathwayEnrollment_cohortId_attended_idx" ON "PathwayEnrollment"("cohortId", "attended");

-- 2. ShowcasePathway -> Pathway (the registration anchor).
ALTER TABLE "ShowcasePathway" ADD COLUMN "linkedPathwayId" TEXT;
CREATE INDEX "ShowcasePathway_linkedPathwayId_idx" ON "ShowcasePathway"("linkedPathwayId");
ALTER TABLE "ShowcasePathway" ADD CONSTRAINT "ShowcasePathway_linkedPathwayId_fkey" FOREIGN KEY ("linkedPathwayId") REFERENCES "Pathway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. ShowcaseGroup (cohort) -> PathwayCohort + the attendance gate flag.
ALTER TABLE "ShowcaseGroup" ADD COLUMN "linkedCohortId" TEXT;
ALTER TABLE "ShowcaseGroup" ADD COLUMN "gateOnAttendance" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ShowcaseGroup_linkedCohortId_idx" ON "ShowcaseGroup"("linkedCohortId");
ALTER TABLE "ShowcaseGroup" ADD CONSTRAINT "ShowcaseGroup_linkedCohortId_fkey" FOREIGN KEY ("linkedCohortId") REFERENCES "PathwayCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Gated-submission attribution: which logged-in trainee submitted.
ALTER TABLE "ShowcaseSubmission" ADD COLUMN "userId" TEXT;
CREATE INDEX "ShowcaseSubmission_programSlug_userId_idx" ON "ShowcaseSubmission"("programSlug", "userId");
