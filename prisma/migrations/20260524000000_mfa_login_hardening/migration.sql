-- MFA + login-hardening fields on User.
--
--   • totpSecret / totpEnabledAt — opt-in TOTP via otplib + an
--     authenticator app (Google Authenticator, 1Password, Authy).
--     Both fields nullable; secret is the base32-encoded shared
--     secret. We store as plain text today, with a clearly labelled
--     row-encryption upgrade path documented in
--     docs/security/encryption-posture.md.
--   • failedLoginCount / lockedUntil / lastFailedLoginAt — brute-
--     force lockout. Threshold 5 fails → 30-min lock; resets on a
--     successful login.
--   • passwordUpdatedAt — change tracking required by 21 CFR Part 11
--     §11.300(b) (periodic password revisions).
ALTER TABLE "User"
  ADD COLUMN "totpSecret"          TEXT,
  ADD COLUMN "totpEnabledAt"       TIMESTAMP(3),
  ADD COLUMN "failedLoginCount"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil"         TIMESTAMP(3),
  ADD COLUMN "lastFailedLoginAt"   TIMESTAMP(3),
  ADD COLUMN "passwordUpdatedAt"   TIMESTAMP(3);

-- Backfill: any user whose password is already set gets a stamp
-- equal to their createdAt so we don't trigger "password expired"
-- nags for accounts that existed before this column.
UPDATE "User"
SET "passwordUpdatedAt" = "createdAt"
WHERE "password" IS NOT NULL;

CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil")
  WHERE "lockedUntil" IS NOT NULL;
