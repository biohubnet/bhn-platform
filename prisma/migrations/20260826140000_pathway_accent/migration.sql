-- Per-pathway identity colour. Stored rather than derived from list position,
-- so adding or reordering a pathway cannot recolour the others.
ALTER TABLE "Pathway" ADD COLUMN "accentColor" TEXT;
