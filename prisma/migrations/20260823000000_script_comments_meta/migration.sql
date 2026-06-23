-- Script comments: edit tracking + range-anchor metadata.
-- Additive only; existing rows default to editCount 0 and NULL anchors.

-- How many times the comment body has been edited (for "edited 2x · last …").
ALTER TABLE "ScriptComment" ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0;
-- When it was last edited (NULL = never edited).
ALTER TABLE "ScriptComment" ADD COLUMN "editedAt" TIMESTAMP(3);
-- Snapshot of the anchored text so the highlight can be re-located if the
-- document is edited and the stored character offsets drift.
ALTER TABLE "ScriptComment" ADD COLUMN "anchorQuote" TEXT;
