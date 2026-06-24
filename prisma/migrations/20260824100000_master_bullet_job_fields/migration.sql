-- Structured job/role details on master bullets (experience groups).
-- All additive + nullable; existing rows keep their free-text anchors.
ALTER TABLE "MasterBullet" ADD COLUMN "anchorCompany"  TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "anchorLocation" TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "anchorStart"    TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "anchorEnd"      TEXT;
ALTER TABLE "MasterBullet" ADD COLUMN "anchorCurrent"  BOOLEAN NOT NULL DEFAULT false;
