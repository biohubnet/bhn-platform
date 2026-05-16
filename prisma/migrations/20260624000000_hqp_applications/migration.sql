-- HQP Advisory Committee — annual open-call windows + member
-- applications. Mirrors the EquipDeadline pattern for windows;
-- HqpMemberApplication carries the application body as JSON
-- so adding a field is a code change, not a migration.
--
-- On approval, the admin review endpoint creates a row in
-- CommitteeMembership (slug = 'hqp') in a transaction with the
-- status flip. That keeps the membership table as the single
-- source of truth for "who's on the committee right now".

CREATE TABLE "HqpApplicationWindow" (
  "id"          TEXT PRIMARY KEY,
  "year"        INTEGER NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "opensAt"     TIMESTAMP(3) NOT NULL,
  "closesAt"    TIMESTAMP(3) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'open',
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "HqpApplicationWindow_year_idx" ON "HqpApplicationWindow"("year");
CREATE INDEX "HqpApplicationWindow_status_opensAt_closesAt_idx"
  ON "HqpApplicationWindow"("status", "opensAt", "closesAt");

ALTER TABLE "HqpApplicationWindow"
  ADD CONSTRAINT "HqpApplicationWindow_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HqpMemberApplication" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "windowId"     TEXT NOT NULL,
  "formData"     JSONB NOT NULL DEFAULT '{}',
  "status"       TEXT NOT NULL DEFAULT 'draft',
  "submittedAt"  TIMESTAMP(3),
  "decidedAt"    TIMESTAMP(3),
  "decidedById"  TEXT,
  "reviewerNote" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "HqpMemberApplication_userId_windowId_key"
  ON "HqpMemberApplication"("userId", "windowId");
CREATE INDEX "HqpMemberApplication_windowId_status_idx"
  ON "HqpMemberApplication"("windowId", "status");
CREATE INDEX "HqpMemberApplication_userId_idx"
  ON "HqpMemberApplication"("userId");

ALTER TABLE "HqpMemberApplication"
  ADD CONSTRAINT "HqpMemberApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HqpMemberApplication"
  ADD CONSTRAINT "HqpMemberApplication_windowId_fkey"
  FOREIGN KEY ("windowId") REFERENCES "HqpApplicationWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HqpMemberApplication"
  ADD CONSTRAINT "HqpMemberApplication_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
