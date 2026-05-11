-- Admin-only annotation column on Registration.
--
-- Nullable text. Used by the events team to flag VIPs / press /
-- speakers, leave special-handling notes for catering or check-in,
-- or record anything else worth remembering about a specific
-- registrant. Never exposed to the registrant themselves.
--
-- No backfill needed — existing rows get NULL, which renders as
-- "no note" in the admin UI.

ALTER TABLE "Registration"
  ADD COLUMN "adminNote" TEXT;
