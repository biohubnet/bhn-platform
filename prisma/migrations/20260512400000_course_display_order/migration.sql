-- Admin-controlled catalog tile order.
--
-- Course tiles on /courses default to createdAt desc, which is fine
-- for chronological browsing but not for the curated arrangement an
-- admin wants (e.g. "this hero course should always lead"). New
-- displayOrder Int column lets admins drag tiles into a fixed order;
-- the catalog query falls back to createdAt desc when two courses
-- share a displayOrder, so the historical behaviour is preserved by
-- default (every existing row gets displayOrder = 0).
--
-- No data backfill needed — every existing course slots into the 0
-- bucket and renders in the same createdAt order as before until an
-- admin drags one to a new position.

ALTER TABLE "Course"
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Course_displayOrder_createdAt_idx"
  ON "Course"("displayOrder", "createdAt" DESC);
