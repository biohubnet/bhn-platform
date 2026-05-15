-- Marker for HR-side demo seeder. Postings created by the
-- /employer/postings "Seed demo data" button get isDemoSeed=true,
-- so the Clear-demo-data button can find + delete them (cascading
-- away ApplicationStatus / Interview / Offer rows).

ALTER TABLE "InternshipPosting"
  ADD COLUMN "isDemoSeed" BOOLEAN NOT NULL DEFAULT false;

-- Partial index — the Clear path only ever queries for true,
-- and demo postings are a small minority. Skip the index for
-- false rows.
CREATE INDEX "InternshipPosting_isDemoSeed_idx"
  ON "InternshipPosting" ("createdById")
  WHERE "isDemoSeed" = true;
