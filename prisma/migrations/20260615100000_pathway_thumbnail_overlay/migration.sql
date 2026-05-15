-- Mirror of the course thumbnail-overlay migration for pathways.
-- The /admin/cover-art admin tool batches the same overlay onto a
-- mix of courses and pathways; pathway records need the same
-- nullable JSONB column. Helper + validation live alongside
-- the course version in src/lib/courses/thumbnail-overlay.ts.

ALTER TABLE "Pathway"
  ADD COLUMN "thumbnailOverlay" JSONB;
