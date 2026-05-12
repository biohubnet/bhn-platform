-- Credit expiry policy.
--
-- Per the BioHubNet ENGAGE program, training credits awarded to HQP
-- expire 365 days from the grant date. (The published BHN policy
-- also has a 6-month / 2 500-credit-used checkpoint which we surface
-- in UI copy; the harder enforcement is left as a follow-up so the
-- first cut of the expiry pipeline is uncomplicated and reviewable.)
--
-- Columns added to CreditTransaction
--   expiresAt      — when the grant lapses (null for debits, null for
--                    pre-policy legacy grants which we leave intact)
--   expiredAt      — set by the sweep once the remaining balance has
--                    been deducted; prevents double-expiry
--   expiredAmount  — running tally of how much of this grant has
--                    already been deducted, so partial debits between
--                    grant and expiry don't get re-counted
--   notified90At   — 90/30/7-day-before-expiry warning timestamps so
--   notified30At     the daily sweep doesn't spam the same user across
--   notified7At      successive runs.
--
-- Indexes support the two sweep queries:
--   (userId, type, expiresAt) → "this user's expiring grants"
--   (expiresAt, expiredAt)     → "next batch the sweep needs to touch"
--
-- No data backfill — existing CreditTransaction rows get NULL expiresAt
-- (= no expiry), so legacy balances remain valid indefinitely until
-- admin separately decides to age them.

ALTER TABLE "CreditTransaction"
  ADD COLUMN "expiresAt"     TIMESTAMP(3),
  ADD COLUMN "expiredAt"     TIMESTAMP(3),
  ADD COLUMN "expiredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "notified90At"  TIMESTAMP(3),
  ADD COLUMN "notified30At"  TIMESTAMP(3),
  ADD COLUMN "notified7At"   TIMESTAMP(3);

CREATE INDEX "CreditTransaction_userId_type_expiresAt_idx"
  ON "CreditTransaction"("userId", "type", "expiresAt");

CREATE INDEX "CreditTransaction_expiresAt_expiredAt_idx"
  ON "CreditTransaction"("expiresAt", "expiredAt");
