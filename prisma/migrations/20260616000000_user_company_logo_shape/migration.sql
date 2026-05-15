-- Optional logo-shape mask for the employer profile.
-- Nullable / empty → natural (current behaviour).
-- Settable from /employer's Edit Profile modal.

ALTER TABLE "User"
  ADD COLUMN "companyLogoShape" TEXT;
