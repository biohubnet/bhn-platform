-- Multi-resume support: drop the userId-unique constraint so a user
-- can own multiple structured resumes (a base + tailored copies per
-- application). Add name / isArchived / derivedFromId / derivedForPostingId
-- columns + their indexes + the self-referential FK for derivation.

-- 1. Drop the unique constraint that capped each user to one resume.
-- NOTE: this `DROP CONSTRAINT` is a no-op in production because the
-- 20260705 init migration created Resume_userId_key as a unique
-- INDEX (`CREATE UNIQUE INDEX`), not a constraint. The follow-up
-- 20260709 migration drops it correctly via `DROP INDEX`. Leaving
-- this line in place since it does drop the entity in environments
-- where Prisma's schema sync created the uniqueness as a constraint.
ALTER TABLE "Resume" DROP CONSTRAINT IF EXISTS "Resume_userId_key";

-- 2. New columns with sensible defaults so existing rows backfill
--    cleanly without a separate data-migration step.
ALTER TABLE "Resume"
  ADD COLUMN IF NOT EXISTS "name"                TEXT    NOT NULL DEFAULT 'Main resume',
  ADD COLUMN IF NOT EXISTS "isArchived"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "derivedFromId"       TEXT,
  ADD COLUMN IF NOT EXISTS "derivedForPostingId" TEXT;

-- 3. Self-referential FK for the "tailored from X" attribution.
--    SET NULL on delete so removing a source resume doesn't cascade-
--    kill every derived copy.
ALTER TABLE "Resume"
  ADD CONSTRAINT "Resume_derivedFromId_fkey"
  FOREIGN KEY ("derivedFromId") REFERENCES "Resume"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Indexes — drop the legacy (userId) index in favour of a composite
--    one that supports the "list my active (non-archived) resumes"
--    query the picker + index page run on every page load.
DROP INDEX IF EXISTS "Resume_userId_idx";
CREATE INDEX IF NOT EXISTS "Resume_userId_isArchived_idx"
  ON "Resume" ("userId", "isArchived");
CREATE INDEX IF NOT EXISTS "Resume_derivedFromId_idx"
  ON "Resume" ("derivedFromId");
