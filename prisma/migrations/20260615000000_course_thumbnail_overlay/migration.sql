-- Non-destructive colour / gradient overlay metadata for each
-- course thumbnail. Admins batch-apply visual treatments to selected
-- thumbnails from /admin/course-thumbnails without having to re-run
-- the SDXL pipeline. Stored as JSONB so we can add fields (e.g. a
-- vignette radius, a noise opacity) later without another migration.
--
-- Shape rendered by src/lib/courses/thumbnail-overlay.ts:
--   { mode: "solid"|"gradient", color1, color2?, angle, opacity, blendMode? }
--
-- Nullable — the absence of overlay is the default, matching every
-- existing row at migration time.

ALTER TABLE "Course"
  ADD COLUMN "thumbnailOverlay" JSONB;
