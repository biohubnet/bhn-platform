-- Retire the "sandbox" accountKind.
--
-- The sandbox-account feature was an admin-only dummy HR + Trainee
-- pair admins could log into for "what does this look like as a
-- learner / employer" testing. We're replacing it with the new
-- /admin/split-view tool (side-by-side HR + Trainee panels) so
-- admins don't need to log out of their own seat at all.
--
-- This migration converts every existing sandbox account to a demo
-- account. Demo accounts have a TTL + auto-cleanup story already
-- in place, so the leftover rows fold cleanly into the existing
-- demo lifecycle. Nothing is deleted here — the row's history,
-- foreign keys, and dependent data (enrollments / submissions /
-- credit applications etc.) all stay intact.
--
-- Idempotent. After the first run no rows match and the UPDATE is
-- a no-op.

UPDATE "User"
SET "accountKind" = 'demo',
    "demoExpiresAt" = COALESCE(
      "demoExpiresAt",
      CURRENT_TIMESTAMP + INTERVAL '30 days'
    )
WHERE "accountKind" = 'sandbox';
