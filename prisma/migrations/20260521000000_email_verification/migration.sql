-- Email-verification token. Distinct from `magicToken` (which is for
-- magic-link sign-in) so the two flows don't tread on each other and
-- so revoking one doesn't impact the other.
ALTER TABLE "User"
  ADD COLUMN "emailVerifyToken"   TEXT,
  ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);

-- Unique constraint so we can `findUnique({ where: { emailVerifyToken } })`.
CREATE UNIQUE INDEX "User_emailVerifyToken_key"
  ON "User"("emailVerifyToken");
