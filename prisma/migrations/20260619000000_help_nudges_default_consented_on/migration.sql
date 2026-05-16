-- Help nudges — flip the default to opt-in-by-default.
--
-- The feature (previously "AI assist") is being renamed to
-- "Help nudges" on every user-visible surface. As part of that we
-- flip the default for AssistPreferences.consented from FALSE to
-- TRUE so newly-created rows opt the user in automatically.
--
-- The /profile consent toggle + the new first-run notice banner
-- both still let the user opt out at any moment — and consent
-- transitions still stamp consentedAt in app code.
--
-- IMPORTANT: We deliberately do NOT backfill existing rows.
-- A user who actively turned this OFF before today's change keeps
-- their choice. Only the default for NEW rows changes.
ALTER TABLE "AssistPreferences"
  ALTER COLUMN "consented" SET DEFAULT true;
