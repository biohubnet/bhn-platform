-- Editable site copy.
--
-- A tiny key/value store the admin "View as superadmin · Edit copy"
-- system writes into. Each row is one editable string — page titles,
-- subtitle descriptions, hero copy — keyed by a stable identifier
-- declared in src/lib/copy-registry.ts. The default text lives in
-- code; the row in this table is the override.
--
-- Why a dedicated table instead of PlatformSetting?
--   • PlatformSetting holds runtime config (course limits, default
--     credits) — short typed values, edited as a form.
--   • EditableCopy holds free-text marketing/UX copy — long-form
--     prose, edited as a textarea. Mixing the two would force the
--     SettingsForm to handle two very different editing experiences.
--
-- The fallback contract (resolve to code default when the row is
-- absent) means we can safely seed nothing here. The migration just
-- creates the table.

CREATE TABLE "EditableCopy" (
  "key"         TEXT PRIMARY KEY,
  "value"       TEXT NOT NULL,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" TEXT
);

CREATE INDEX "EditableCopy_updatedAt_idx" ON "EditableCopy"("updatedAt" DESC);
