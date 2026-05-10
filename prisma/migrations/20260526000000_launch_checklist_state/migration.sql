-- LaunchChecklistState — per-item mutable state for the Launch
-- Readiness dashboard. Canonical list lives in code; only state
-- (manual override status, owner, target date, notes) lives here.

CREATE TABLE "LaunchChecklistState" (
  "id"             TEXT NOT NULL,
  "itemKey"        TEXT NOT NULL,
  "manualStatus"   TEXT,
  "notes"          TEXT,
  "ownerId"        TEXT,
  "targetDate"     TIMESTAMP(3),
  "decisionNeeded" BOOLEAN NOT NULL DEFAULT false,
  "updatedById"    TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaunchChecklistState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaunchChecklistState_itemKey_key"
  ON "LaunchChecklistState"("itemKey");

ALTER TABLE "LaunchChecklistState"
  ADD CONSTRAINT "LaunchChecklistState_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LaunchChecklistState"
  ADD CONSTRAINT "LaunchChecklistState_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
