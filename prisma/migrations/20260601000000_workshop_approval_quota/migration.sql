-- Workshop approval + waitlist quota + audit columns.
--
-- Three shapes land in this one migration so they can roll together:
--
-- 1. BhnEvent / Workshop policy flags
--      • BhnEvent.requiresApproval     — when true, new Registration
--                                        rows start in `pending`.
--      • Workshop.requiresApproval     — when true, new WorkshopBooking
--                                        rows start in `pending`.
--      • Workshop.waitlistCapacity     — hard cap on waitlist length.
--        Once both `capacity` confirmed + `waitlistCapacity` waitlisted
--        seats are taken, new bookings get rejected at the service
--        layer with a `waitlist_full` code.
--      • Workshop.capacity default     — tightened to 20 (the standard
--        symposium tour/workshop size). Existing rows retain their
--        own value because DEFAULT only affects subsequent INSERTs.
--
-- 2. Approval audit columns on Registration + WorkshopBooking
--      • approvedAt / approvedById — populated when an admin moves
--        the row out of `pending`. Null while pending (or, after the
--        backfill below, equal to the original create-time for legacy
--        already-confirmed rows so the audit story stays whole).
--
-- 3. FK constraints from approver → User with ON DELETE SET NULL —
--    same shape as the other "edited by"/"reviewed by" audit columns
--    elsewhere in the schema (CreditApplication.reviewedBy, etc.).
--    The audit row survives a user deletion; the link just goes null.
--
-- Backwards-compat note: the WorkshopBooking.status string column
-- gains a new legal value (`pending`) but the column itself isn't
-- altered — only the enforcement code understands the new value.
-- That keeps the change idempotent re-runnable even on a partial
-- failure and avoids a check-constraint that the schema otherwise
-- doesn't carry for any other status field.

-- ── 1. Policy flags ────────────────────────────────────────────
ALTER TABLE "BhnEvent"
  ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Workshop"
  ADD COLUMN "waitlistCapacity" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

-- Tighten the default for any future inserts. Existing rows keep their
-- own capacity — this only affects rows created without an explicit
-- capacity value.
ALTER TABLE "Workshop" ALTER COLUMN "capacity" SET DEFAULT 20;

-- ── 2. Audit columns ───────────────────────────────────────────
ALTER TABLE "Registration"
  ADD COLUMN "approvedAt"   TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

ALTER TABLE "WorkshopBooking"
  ADD COLUMN "approvedAt"   TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

-- ── 3. Foreign keys ────────────────────────────────────────────
ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkshopBooking"
  ADD CONSTRAINT "WorkshopBooking_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. Backfill ────────────────────────────────────────────────
-- Rows that landed before this migration are by definition not
-- waiting on approval. Stamp `approvedAt` so they don't show up
-- in the new pending-approval admin queue. We use the original
-- create-time (createdAt / bookedAt) for the audit story.
UPDATE "Registration"
SET    "approvedAt" = "createdAt"
WHERE  "registrationStatus" = 'confirmed'
  AND  "approvedAt" IS NULL;

UPDATE "WorkshopBooking"
SET    "approvedAt" = "bookedAt"
WHERE  "status" IN ('confirmed', 'waitlist')
  AND  "approvedAt" IS NULL;
