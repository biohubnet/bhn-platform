-- Loyalty / merch rewards.
--
-- Two thresholds (2,500 and 5,000 lifetime credits SPENT on coursework)
-- unlock physical-merch bundles. Once unlocked, a row exists in
-- MerchReward with status='UNCLAIMED'; the trainee submits shipping
-- details to flip to CLAIMED, an admin marks SHIPPED with carrier +
-- tracking, optionally DELIVERED, or CANCELLED with a reason.
--
-- Idempotency: the (userId, tier) unique constraint is the natural
-- one-time-per-user lock. The application-side ensureMerchUnlocks()
-- helper relies on this — it tries the insert and swallows P2002.
--
-- The address/size/notes fields are nullable so the row can be created
-- in UNCLAIMED state with just (userId, tier, threshold, status). They
-- get filled in at claim time and frozen there — see the model
-- comment in schema.prisma.

CREATE TABLE "MerchReward" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "tier"            INTEGER NOT NULL,
  "threshold"       INTEGER NOT NULL,
  "unlockedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"          TEXT NOT NULL DEFAULT 'UNCLAIMED',

  -- Shipping snapshot (captured at claim time)
  "claimedAt"       TIMESTAMP(3),
  "recipientName"   TEXT,
  "addressLine1"    TEXT,
  "addressLine2"    TEXT,
  "city"            TEXT,
  "region"          TEXT,
  "postalCode"      TEXT,
  "country"         TEXT,
  "phone"           TEXT,
  "shirtSize"       TEXT,
  "notes"           TEXT,

  -- Fulfilment metadata
  "shippedAt"       TIMESTAMP(3),
  "carrier"         TEXT,
  "trackingNumber"  TEXT,
  "trackingUrl"     TEXT,
  "fulfilledById"   TEXT,
  "cancelledReason" TEXT,

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MerchReward_pkey" PRIMARY KEY ("id")
);

-- One reward per tier per user — idempotency lock for the auto-unlock
-- helper.
CREATE UNIQUE INDEX "MerchReward_userId_tier_key"
  ON "MerchReward"("userId", "tier");

-- Admin queue queries are filtered by status + sorted by unlock /
-- claim time. The compound index keeps "show me all CLAIMED rows in
-- order" cheap as the table grows.
CREATE INDEX "MerchReward_status_unlockedAt_idx"
  ON "MerchReward"("status", "unlockedAt");

ALTER TABLE "MerchReward"
  ADD CONSTRAINT "MerchReward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin who marked the row shipped / delivered / cancelled. SetNull on
-- admin deletion so we keep the historical record without a dangling FK.
ALTER TABLE "MerchReward"
  ADD CONSTRAINT "MerchReward_fulfilledById_fkey"
  FOREIGN KEY ("fulfilledById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
