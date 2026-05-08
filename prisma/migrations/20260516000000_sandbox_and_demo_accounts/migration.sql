-- Two new categories of non-real accounts:
--
--   "sandbox" — an admin's personal play account (employer + trainee
--               pair), idempotent per admin. Never auto-deletes.
--   "demo"    — a prospective partner's time-limited demo workspace.
--               Auto-deletes when demoExpiresAt < NOW().
--
-- Real accounts get accountKind="real" (the default). Counts on /admin
-- pages should filter to accountKind="real" so sandbox/demo rows don't
-- pollute platform stats.
ALTER TABLE "User"
  ADD COLUMN "accountKind"     TEXT NOT NULL DEFAULT 'real',
  ADD COLUMN "demoExpiresAt"   TIMESTAMP(3),
  ADD COLUMN "createdByAdminId" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE INDEX "User_accountKind_demoExpiresAt_idx"
  ON "User" ("accountKind", "demoExpiresAt");
CREATE INDEX "User_createdByAdminId_idx"
  ON "User" ("createdByAdminId");
