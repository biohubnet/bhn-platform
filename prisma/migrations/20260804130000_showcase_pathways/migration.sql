-- Showcase pathways: a "pathway" is the program (named once, no cohort
-- number); its cohorts are ShowcaseGroup rows with pathwayId set. Additive
-- only — existing standalone groups (pathwayId null) keep working.

CREATE TABLE "ShowcasePathway" (
    "id"          TEXT         NOT NULL,
    "slug"        TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "eyebrow"     TEXT,
    "intro"       TEXT,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowcasePathway_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShowcasePathway_slug_key" ON "ShowcasePathway" ("slug");
CREATE INDEX "ShowcasePathway_createdAt_idx" ON "ShowcasePathway" ("createdAt");

ALTER TABLE "ShowcaseGroup" ADD COLUMN "pathwayId" TEXT;
ALTER TABLE "ShowcaseGroup" ADD COLUMN "cohortNumber" INTEGER;

CREATE INDEX "ShowcaseGroup_pathwayId_idx" ON "ShowcaseGroup" ("pathwayId");

ALTER TABLE "ShowcaseGroup"
    ADD CONSTRAINT "ShowcaseGroup_pathwayId_fkey"
    FOREIGN KEY ("pathwayId") REFERENCES "ShowcasePathway"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
