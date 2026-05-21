-- Drop the lingering unique index on Resume.userId.
--
-- Backstory: the 20260706_resume_multi_per_user migration tried to
-- drop this with `ALTER TABLE … DROP CONSTRAINT IF EXISTS
-- "Resume_userId_key";`. That works when the uniqueness was added as
-- a CONSTRAINT, but the original 20260705_resume_structure_comments
-- migration created it as `CREATE UNIQUE INDEX "Resume_userId_key"
-- ON "Resume" ("userId");` — i.e. a unique INDEX, not a CONSTRAINT.
-- PostgreSQL's DROP CONSTRAINT IF EXISTS silently no-ops on an index,
-- so the unique index survived the multi-resume migration and kept
-- producing P2002 errors whenever a user tried to create a second
-- resume in production.
--
-- This migration drops the index directly. Idempotent — safe to re-run
-- even on environments where the previous migration accidentally
-- already removed it (dev databases that were reset, for example).

DROP INDEX IF EXISTS "Resume_userId_key";
