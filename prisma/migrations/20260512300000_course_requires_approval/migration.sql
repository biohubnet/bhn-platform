-- Per-course enrollment-approval gate.
--
-- Some courses (e.g. high-value certifications, instructor-led cohorts)
-- need admin approval before a trainee actually enrols. Adding this as
-- a per-course toggle keeps the existing self-serve path the default
-- for the catalog at large, while letting admins opt specific courses
-- into the same admin-review flow that learning pathways already use.
--
-- When requiresApproval=true, the user-facing enrol endpoint creates
-- the Enrollment row with status="pending" instead of "active". The
-- /admin/enrollments page surfaces these in the "Pending requests"
-- section grouped by course, with per-row approve / reject actions.
--
-- No backfill — every existing course stays self-serve (false).

ALTER TABLE "Course"
  ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
