-- Internship contact info: the listing copy promised "apply directly
-- with the contact on each posting" but the schema had no contact
-- columns. Add them. contactEmail is the primary apply target;
-- contactName + contactPhone are optional for posting authors.
ALTER TABLE "InternshipPosting"
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactName"  TEXT,
  ADD COLUMN "contactPhone" TEXT;

-- Saved / bookmarked postings — trainee-side. Lets a trainee mark
-- postings they want to come back to (deadline tracking, comparison,
-- "send my application later" reminder). One row per (user, posting).
CREATE TABLE "UserSavedPosting" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "postingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserSavedPosting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSavedPosting_userId_postingId_key"
  ON "UserSavedPosting"("userId", "postingId");

CREATE INDEX "UserSavedPosting_userId_createdAt_idx"
  ON "UserSavedPosting"("userId", "createdAt");

ALTER TABLE "UserSavedPosting"
  ADD CONSTRAINT "UserSavedPosting_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "UserSavedPosting"
  ADD CONSTRAINT "UserSavedPosting_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE;
