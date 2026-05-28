-- EventReminder — bookkeeping for the timed-reminder cron.
-- A row is inserted per (eventId, kind) once a reminder has gone
-- out; the cron uses the missing-row signal to know what to send
-- next. (kind ∈ {"one_week", "one_day", "one_hour"})

CREATE TABLE "EventReminder" (
  "id"          TEXT PRIMARY KEY,
  "eventId"     TEXT NOT NULL,
  "kind"        TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt"      TIMESTAMP(3),
  "sentCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EventReminder_eventId_kind_key" ON "EventReminder"("eventId", "kind");
CREATE INDEX "EventReminder_scheduledAt_sentAt_idx" ON "EventReminder"("scheduledAt", "sentAt");
