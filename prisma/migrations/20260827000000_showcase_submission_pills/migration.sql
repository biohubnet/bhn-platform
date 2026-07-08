-- Editable membership tags (pills) on each showcase submission card.
-- JSONB array of { kind: "workshop" | "pathway" | "cohort", label }.
-- Additive + defaulted so existing rows are unaffected.
ALTER TABLE "ShowcaseSubmission"
  ADD COLUMN IF NOT EXISTS "pills" JSONB NOT NULL DEFAULT '[]';
