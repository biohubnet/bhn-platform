-- VentureLift two-stage workflow.
--
-- The existing EquipApplication row carries pre-screening and
-- the full application as two stages of the SAME application —
-- linked by the same id, never duplicated. The applicationStage
-- column says which stage is currently being worked on; the
-- status column says where within that stage. New intermediate
-- statuses (pre_screen_approved / pre_screen_rejected) sit
-- between submitted and the final approved/rejected.
--
-- All new columns are nullable / have defaults so existing rows
-- migrate cleanly without backfill.

ALTER TABLE "EquipApplication"
  ADD COLUMN "applicationStage"     TEXT NOT NULL DEFAULT 'pre_screen',
  ADD COLUMN "preScreenDecidedAt"   TIMESTAMP(3),
  ADD COLUMN "preScreenReviewerNote" TEXT,
  ADD COLUMN "fullAppSubmittedAt"   TIMESTAMP(3),
  ADD COLUMN "reviewerScores"       JSONB;

-- Backfill: any existing rows that aren't still drafts have
-- already moved past the pre-screening stage in spirit. For
-- VentureConnect we treat every row as "full_app" since VC has
-- no pre-screening. For VentureLift rows that are already past
-- "draft", default them to "full_app" as the safest assumption
-- (admins can correct from the review surface if needed).
UPDATE "EquipApplication"
SET "applicationStage" = 'full_app'
WHERE "stream" = 'venture_connect'
   OR ("stream" = 'venture_lift' AND "status" NOT IN ('draft', 'submitted'));
