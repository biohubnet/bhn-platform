-- One-time cleanup: wipe every demo workspace's *data* + every demo
-- invite so /admin/demo-workspaces starts with a clean slate on
-- the next deploy.
--
-- ── Why we no longer DELETE from "User" here ──────────────────────
-- The original draft of this migration did `DELETE FROM "User"
-- WHERE "accountKind" = 'demo'`. That failed in production because
-- not every FK into User declares ON DELETE CASCADE — the DB
-- (rightly) refused to break referential integrity. Prisma marks
-- the migration failed and refuses to apply any subsequent
-- migration until it's resolved.
--
-- Pragmatic fix: this migration only deletes things we KNOW are
-- safe (postings, application statuses, invites — all of those
-- either cascade cleanly or aren't FK-referenced by other tables).
-- For removing the demo users themselves, the admin uses the
-- runtime "Clear all demos" / per-row delete buttons on
-- /admin/demo-workspaces. Those route through the
-- `deleteDemoWorkspace()` helper which is FK-aware: it walks the
-- relations in the right order. SQL bulk-delete here can't easily
-- match that without enumerating every FK into User by hand.
--
-- Every DELETE below is naturally idempotent (no rows = no-op),
-- so reapplying this migration after a partial failure is safe.

-- Application statuses where the applicant OR the posting was
-- created by a demo account.
DELETE FROM "ApplicationStatus"
WHERE "applicantId" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
)
OR "postingId" IN (
  SELECT "id" FROM "InternshipPosting"
  WHERE "createdById" IN (SELECT "id" FROM "User" WHERE "accountKind" = 'demo')
);

-- Internship postings authored by demo employers.
DELETE FROM "InternshipPosting"
WHERE "createdById" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo' AND "role" = 'employer'
);

-- Demo invites — clearable independently of the users.
DELETE FROM "EmployerInvite" WHERE "demoMode" = true;
