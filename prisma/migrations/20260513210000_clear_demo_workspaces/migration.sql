-- One-time cleanup: wipe every demo workspace (and its data) +
-- every demo invite so /admin/demo-workspaces starts with a clean
-- slate on the next deploy.
--
-- Distinct from 20260512400000-style data migrations: this one
-- deletes USERS too, because a "demo workspace" is the demo employer
-- user + the demo trainee applicants seeded under them. Real
-- accounts (accountKind <> 'demo') are not touched.
--
-- Order matters because of FK constraints — clear leaf rows first,
-- then parents.

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

-- Demo users — both the employer and any trainee applicants we
-- seeded under them. Anything still on the user (form submissions,
-- credit applications, pool exit feedback, etc.) cascades via the
-- declared User relations.
DELETE FROM "User" WHERE "accountKind" = 'demo';

-- Demo invites — clearable independently of the users.
DELETE FROM "EmployerInvite" WHERE "demoMode" = true;
