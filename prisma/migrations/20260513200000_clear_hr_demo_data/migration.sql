-- One-time cleanup: wipe every demo-account-attributable row that
-- shows on an HR / employer surface, so the deployed instance starts
-- with a fresh slate.
--
-- We only delete the data; the demo USERS themselves stay because
-- they're reusable for future test rounds (and because the new
-- DemoSeedAndClearTray seed buttons rely on a demo user existing
-- to attach new rows to).
--
-- Idempotent: after the first run there's nothing left to match,
-- so subsequent runs are no-ops. Safe to keep in the migration
-- history.
--
-- Scope (everything HR can see):
--   • InternshipPosting authored by a demo account
--   • EventFormSubmission submitted by a demo account (covers
--     talent-application and every other form)
--   • Registration on BhnEvents with slug starting "demo-"
--     (cascade-then-event-delete pattern keeps relations clean)
--   • BhnEvent with slug starting "demo-"
--   • ApplicationStatus where the applicant is a demo account
--   • CreditApplication from a demo account (visible to admin HR
--     overview)
--   • PoolExitFeedback from a demo account (defensive — cascades
--     via EventFormSubmission deletion above, but be explicit in
--     case ordering or orphans bite us)

-- Internship postings authored by demo accounts.
DELETE FROM "InternshipPosting"
WHERE "createdById" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
);

-- Application statuses where the applicant is a demo account
-- (delete before the related InternshipPostings are gone, but
-- since postings cascade applicationStatuses on FK, this is
-- belt-and-braces against any orphans).
DELETE FROM "ApplicationStatus"
WHERE "applicantId" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
);

-- Pool exit feedback rows from demo accounts.
DELETE FROM "PoolExitFeedback"
WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
);

-- Every form submission from a demo account.
DELETE FROM "EventFormSubmission"
WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
);

-- Credit applications from demo accounts.
DELETE FROM "CreditApplication"
WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "accountKind" = 'demo'
);

-- Demo events (slug-prefixed). Wipe registrations first, then the
-- events themselves.
DELETE FROM "Registration"
WHERE "eventId" IN (
  SELECT "id" FROM "BhnEvent" WHERE "slug" LIKE 'demo-%'
);
DELETE FROM "BhnEvent" WHERE "slug" LIKE 'demo-%';
