-- Equip funding-window deadlines. Each row is one application
-- window for one stream (venture_connect or venture_lift).
--
-- Status semantics:
--   • open     — submissions allowed (may be future-dated)
--   • closed   — submissions blocked; either manually closed or
--                the original deadline passed without extension
--   • extended — equivalent to open for gating, but the row
--                preserves originalDeadlineAt for audit
--
-- The stream column is plain TEXT (not an enum) so adding a
-- third stream later is a code change, not a schema migration.

CREATE TABLE "EquipDeadline" (
  "id"                  TEXT PRIMARY KEY,
  "stream"              TEXT NOT NULL,
  "deadlineAt"          TIMESTAMP(3) NOT NULL,
  "originalDeadlineAt"  TIMESTAMP(3) NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'open',
  "cycleLabel"          TEXT,
  "note"                TEXT,
  "createdById"         TEXT NOT NULL,
  "closedAt"            TIMESTAMP(3),
  "closedById"          TEXT,
  "extendedAt"          TIMESTAMP(3),
  "extendedById"        TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);
CREATE INDEX "EquipDeadline_stream_status_deadlineAt_idx"
  ON "EquipDeadline"("stream", "status", "deadlineAt");
CREATE INDEX "EquipDeadline_deadlineAt_idx"
  ON "EquipDeadline"("deadlineAt");

ALTER TABLE "EquipDeadline"
  ADD CONSTRAINT "EquipDeadline_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipDeadline"
  ADD CONSTRAINT "EquipDeadline_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipDeadline"
  ADD CONSTRAINT "EquipDeadline_extendedById_fkey"
  FOREIGN KEY ("extendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
