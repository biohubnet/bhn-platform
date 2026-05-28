-- Phase 3 — host attribution, custom registration questions, and
-- broadcast audit. Three independent feature areas; one migration
-- because they all attach to BhnEvent + ship at the same time.

-- ── EventHost ────────────────────────────────────────────────────
CREATE TABLE "EventHost" (
  "id"           TEXT PRIMARY KEY,
  "eventId"      TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'host',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventHost_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventHost_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventHost_eventId_userId_key" ON "EventHost"("eventId", "userId");
CREATE INDEX "EventHost_eventId_displayOrder_idx" ON "EventHost"("eventId", "displayOrder");

-- ── CustomRegQuestion ────────────────────────────────────────────
CREATE TABLE "CustomRegQuestion" (
  "id"           TEXT PRIMARY KEY,
  "eventId"      TEXT NOT NULL,
  "key"          TEXT NOT NULL,
  "label"        TEXT NOT NULL,
  "hint"         TEXT,
  "kind"         TEXT NOT NULL DEFAULT 'text',
  "options"      JSONB,
  "required"     BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomRegQuestion_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomRegQuestion_eventId_key_key" ON "CustomRegQuestion"("eventId", "key");
CREATE INDEX "CustomRegQuestion_eventId_displayOrder_idx" ON "CustomRegQuestion"("eventId", "displayOrder");

-- ── CustomRegAnswer ──────────────────────────────────────────────
CREATE TABLE "CustomRegAnswer" (
  "id"                  TEXT PRIMARY KEY,
  "registrationId"      TEXT NOT NULL,
  "customRegQuestionId" TEXT NOT NULL,
  "value"               TEXT NOT NULL,
  CONSTRAINT "CustomRegAnswer_registrationId_fkey" FOREIGN KEY ("registrationId")
    REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomRegAnswer_customRegQuestionId_fkey" FOREIGN KEY ("customRegQuestionId")
    REFERENCES "CustomRegQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomRegAnswer_registrationId_customRegQuestionId_key" ON "CustomRegAnswer"("registrationId", "customRegQuestionId");
CREATE INDEX "CustomRegAnswer_customRegQuestionId_idx" ON "CustomRegAnswer"("customRegQuestionId");

-- ── EventBroadcast ───────────────────────────────────────────────
CREATE TABLE "EventBroadcast" (
  "id"             TEXT PRIMARY KEY,
  "eventId"        TEXT NOT NULL,
  "sentById"       TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "audienceFilter" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount"      INTEGER NOT NULL DEFAULT 0,
  "sentAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventBroadcast_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventBroadcast_sentById_fkey" FOREIGN KEY ("sentById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EventBroadcast_eventId_createdAt_idx" ON "EventBroadcast"("eventId", "createdAt");
