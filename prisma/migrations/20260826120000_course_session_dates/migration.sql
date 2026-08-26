-- Free-text session schedule for cohort programmes. The existing
-- cohortStartDate/cohortEndDate pair cannot express a programme offered as
-- several discrete multi-day sittings across different cities.
ALTER TABLE "Course" ADD COLUMN "sessionDates" TEXT;
