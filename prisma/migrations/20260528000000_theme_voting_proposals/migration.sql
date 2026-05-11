-- Theme feedback — adds two tables for user voting on themes and
-- user-submitted theme proposals.
--
-- ThemeVote
--   One row per user per sentiment (favorite | least_favorite),
--   enforced via UNIQUE(userId, sentiment). Upsert by this composite
--   to "change your mind" rather than accumulate rows.
--
-- ThemeProposal
--   User-submitted theme idea. Admin triages via
--   /admin/theme-proposals. When admin marks "shipped", they can
--   optionally issue a tier-3 MerchReward bounty (bountyRewardId
--   links to the MerchReward row).
--
-- Hand-crafted SQL — `prisma migrate dev` is blocked by the known
-- pgvector-index drift on Course/Pathway. Modelled on prior
-- migrations in this repo (merch_rewards, launch_checklist_state,
-- add_events_module).
--
-- This migration does NOT modify any existing table.

-- ════════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════════

CREATE TABLE "ThemeVote" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "themeId"   TEXT NOT NULL,
  "sentiment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThemeVote_pkey" PRIMARY KEY ("id")
);

-- One favorite + one least-favorite per user. Upserts replace the
-- existing row rather than accumulating votes.
CREATE UNIQUE INDEX "ThemeVote_userId_sentiment_key"
  ON "ThemeVote"("userId", "sentiment");

-- Supports the aggregated "top loved" / "top disliked" stats.
CREATE INDEX "ThemeVote_themeId_sentiment_idx"
  ON "ThemeVote"("themeId", "sentiment");


CREATE TABLE "ThemeProposal" (
  "id"             TEXT NOT NULL,
  "proposerId"     TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "inspiration"    TEXT,
  "status"         TEXT NOT NULL DEFAULT 'submitted',
  "reviewerId"     TEXT,
  "reviewerNote"   TEXT,
  "reviewedAt"     TIMESTAMP(3),
  "shippedThemeId" TEXT,
  "bountyIssued"   BOOLEAN NOT NULL DEFAULT false,
  "bountyRewardId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThemeProposal_pkey" PRIMARY KEY ("id")
);

-- Supports the admin queue: filter by status + chronological sort.
CREATE INDEX "ThemeProposal_status_createdAt_idx"
  ON "ThemeProposal"("status", "createdAt");

-- Supports the proposer's "my proposals" page.
CREATE INDEX "ThemeProposal_proposerId_idx"
  ON "ThemeProposal"("proposerId");


-- ════════════════════════════════════════════════════════════════
-- Foreign keys
-- ════════════════════════════════════════════════════════════════

-- ThemeVote → User (Cascade — votes are personal preferences, no
-- audit value once the user is gone)
ALTER TABLE "ThemeVote"
  ADD CONSTRAINT "ThemeVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ThemeProposal → User (proposer: Cascade; reviewer: SetNull to
-- preserve the proposal record if the reviewer admin is removed)
ALTER TABLE "ThemeProposal"
  ADD CONSTRAINT "ThemeProposal_proposerId_fkey"
  FOREIGN KEY ("proposerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThemeProposal"
  ADD CONSTRAINT "ThemeProposal_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
