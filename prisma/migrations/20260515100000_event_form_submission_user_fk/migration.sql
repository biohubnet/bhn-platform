-- EventFormSubmission.userId existed as a free TEXT column. Promote it
-- to a real foreign key so we can use Prisma's `include: { user: ... }`
-- in the employer applicants endpoint.
--
-- Defensive: drop any orphaned userIds (rows pointing at deleted users)
-- before adding the constraint so the migration doesn't fail mid-flight.
UPDATE "EventFormSubmission"
   SET "userId" = NULL
 WHERE "userId" IS NOT NULL
   AND "userId" NOT IN (SELECT "id" FROM "User");

ALTER TABLE "EventFormSubmission"
  ADD CONSTRAINT "EventFormSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "EventFormSubmission_userId_idx"
  ON "EventFormSubmission" ("userId");
