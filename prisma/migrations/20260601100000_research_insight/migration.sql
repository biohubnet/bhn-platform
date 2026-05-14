-- ResearchInsight — per-period "what users told us" synthesis row.
--
-- Storage for the synthesis note an admin writes on /admin/insights
-- after reading the period's user signals (theme votes, feedback,
-- access requests, etc.). One row per period.
--
-- Forward-only migration; no backfill needed (table is empty on
-- creation; first row lands the first time an admin clicks Save
-- on the insights page).

CREATE TABLE "ResearchInsight" (
  "id"                     TEXT PRIMARY KEY,
  "period"                 TEXT NOT NULL,
  "body"                   TEXT NOT NULL,
  "signalsLinked"          JSONB,
  "publishedToChangelogAt" TIMESTAMP(3),
  "publishedChangelogId"   TEXT,
  "createdById"            TEXT,
  "updatedById"            TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "ResearchInsight_period_key" ON "ResearchInsight"("period");
CREATE INDEX "ResearchInsight_createdAt_idx" ON "ResearchInsight"("createdAt");

ALTER TABLE "ResearchInsight"
  ADD CONSTRAINT "ResearchInsight_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResearchInsight"
  ADD CONSTRAINT "ResearchInsight_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
