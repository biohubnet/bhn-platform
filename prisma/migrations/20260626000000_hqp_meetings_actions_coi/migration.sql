-- HQP committee meetings + action items + COI disclosures.
-- Replaces the manual "meeting details template.docx + tracked
-- attendance + action items" workflow from the BHN docs.

CREATE TABLE "HqpMeeting" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 60,
  "agenda"      TEXT,
  "notes"       TEXT,
  "status"      TEXT NOT NULL DEFAULT 'scheduled',
  "meetingUrl"  TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "HqpMeeting_scheduledAt_idx"        ON "HqpMeeting"("scheduledAt");
CREATE INDEX "HqpMeeting_status_scheduledAt_idx" ON "HqpMeeting"("status", "scheduledAt");

ALTER TABLE "HqpMeeting"
  ADD CONSTRAINT "HqpMeeting_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HqpMeetingAttendance" (
  "id"        TEXT PRIMARY KEY,
  "meetingId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'invited',
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "HqpMeetingAttendance_meetingId_userId_key" ON "HqpMeetingAttendance"("meetingId", "userId");
CREATE INDEX "HqpMeetingAttendance_meetingId_status_idx"       ON "HqpMeetingAttendance"("meetingId", "status");

ALTER TABLE "HqpMeetingAttendance"
  ADD CONSTRAINT "HqpMeetingAttendance_meetingId_fkey"
  FOREIGN KEY ("meetingId") REFERENCES "HqpMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HqpMeetingAttendance"
  ADD CONSTRAINT "HqpMeetingAttendance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HqpActionItem" (
  "id"             TEXT PRIMARY KEY,
  "meetingId"      TEXT,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "assignedToId"   TEXT,
  "dueOn"          TIMESTAMP(3),
  "status"         TEXT NOT NULL DEFAULT 'open',
  "createdById"    TEXT NOT NULL,
  "resolvedAt"     TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX "HqpActionItem_status_dueOn_idx"           ON "HqpActionItem"("status", "dueOn");
CREATE INDEX "HqpActionItem_assignedToId_status_idx"    ON "HqpActionItem"("assignedToId", "status");
CREATE INDEX "HqpActionItem_meetingId_idx"              ON "HqpActionItem"("meetingId");

ALTER TABLE "HqpActionItem"
  ADD CONSTRAINT "HqpActionItem_meetingId_fkey"
  FOREIGN KEY ("meetingId") REFERENCES "HqpMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HqpActionItem"
  ADD CONSTRAINT "HqpActionItem_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HqpActionItem"
  ADD CONSTRAINT "HqpActionItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HqpCoiDisclosure" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "scope"       TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "declaredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "HqpCoiDisclosure_userId_active_idx"          ON "HqpCoiDisclosure"("userId", "active");
CREATE INDEX "HqpCoiDisclosure_active_declaredAt_idx"      ON "HqpCoiDisclosure"("active", "declaredAt");

ALTER TABLE "HqpCoiDisclosure"
  ADD CONSTRAINT "HqpCoiDisclosure_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
