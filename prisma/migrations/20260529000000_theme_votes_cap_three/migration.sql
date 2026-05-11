-- Lift the theme-vote cap from 1 to 3 per sentiment per user.
--
-- Schema change: replace the old @@unique([userId, sentiment]) with
-- @@unique([userId, sentiment, themeId]). The new constraint is
-- strictly looser than the old one — every (userId, sentiment,
-- themeId) triple was already distinct under the old constraint
-- (because the old one only allowed one row per (userId, sentiment)),
-- so existing data is automatically valid. No data migration needed.
--
-- The count cap (≤ 3 per sentiment per user) is enforced at the
-- API layer (POST /api/themes/vote) rather than via a DB CHECK.
-- Row-level "count(*) ≤ N" constraints aren't expressible in
-- vanilla Postgres without triggers, and the volume is low — a
-- transactional count + insert is sufficient.
--
-- Order of operations
--   1. Drop the old unique index (Prisma default name pattern
--      <Table>_<col>_<col>_key)
--   2. Create the new triple-column unique index
--
-- The (themeId, sentiment) aggregation index stays untouched.

DROP INDEX IF EXISTS "ThemeVote_userId_sentiment_key";

CREATE UNIQUE INDEX "ThemeVote_userId_sentiment_themeId_key"
  ON "ThemeVote"("userId", "sentiment", "themeId");
