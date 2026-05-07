-- Company profile fields on User (employer-only)
ALTER TABLE "User"
  ADD COLUMN "companyWebsite"     TEXT,
  ADD COLUMN "companyLogo"        TEXT,
  ADD COLUMN "companyIndustry"    TEXT,
  ADD COLUMN "companySize"        TEXT,
  ADD COLUMN "companyLocation"    TEXT,
  ADD COLUMN "companyDescription" TEXT,
  ADD COLUMN "companyFounded"     TEXT;

-- EmployerInvite: one-time signup link for partners
CREATE TABLE "EmployerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "companyName" TEXT,
    "companyWebsite" TEXT,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "EmployerInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployerInvite_token_key" ON "EmployerInvite"("token");
CREATE INDEX "EmployerInvite_email_idx" ON "EmployerInvite"("email");
CREATE INDEX "EmployerInvite_invitedById_createdAt_idx" ON "EmployerInvite"("invitedById", "createdAt");
