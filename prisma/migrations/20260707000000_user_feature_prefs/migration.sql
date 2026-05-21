-- Per-user sidebar / feature toggle preferences. JSON blob shaped
-- as { hidden: string[]; order: string[] }. NULL until the user
-- visits /profile/preferences and makes a change — server-side
-- code applies the registry defaults (src/lib/preferences/registry.ts)
-- whenever the column is NULL/empty.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "featurePrefs" JSONB;
