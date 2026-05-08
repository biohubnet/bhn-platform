-- Lightweight open tracking for employer invites. Each magic-link
-- click bumps openCount and refreshes lastOpenedAt. Useful for the
-- admin-side "did the recipient actually open the link" signal.
ALTER TABLE "EmployerInvite"
  ADD COLUMN "openCount"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastOpenedAt" TIMESTAMP(3);
