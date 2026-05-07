-- Three-state newsletter intent at signup (subscribe | no | already)
-- and a timestamp the admin updates after copying the new sign-ups
-- to the clipboard, so they aren't re-exported next time.
ALTER TABLE "User"
  ADD COLUMN "newsletterStatus" TEXT NOT NULL DEFAULT 'no',
  ADD COLUMN "newsletterExportedAt" TIMESTAMP(3);

-- Backfill: anyone already flagged as subscribed gets status='subscribe'
UPDATE "User"
SET "newsletterStatus" = 'subscribe'
WHERE "newsletterSubscribed" = TRUE;

-- Index used by the admin page when filtering "new since last export"
CREATE INDEX "User_newsletterStatus_newsletterExportedAt_idx"
  ON "User" ("newsletterStatus", "newsletterExportedAt");
