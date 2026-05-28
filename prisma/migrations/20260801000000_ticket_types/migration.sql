-- Phase 4 — paid ticketing via Stripe.
--
-- A new TicketType model captures the bookable tiers per event
-- ("Standard $40", "Student $20", "Industry $100"). The existing
-- payment* columns on Registration are repurposed for the per-row
-- payment outcome — no schema change needed there.
--
-- priceCents = 0 keeps the free-registration path identical to
-- today's flow even on events that have ticket types defined.

CREATE TABLE "TicketType" (
  "id"            TEXT PRIMARY KEY,
  "eventId"       TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT,
  "priceCents"    INTEGER NOT NULL DEFAULT 0,
  "currency"      TEXT NOT NULL DEFAULT 'CAD',
  "capacity"      INTEGER,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "displayOrder"  INTEGER NOT NULL DEFAULT 0,
  "stripePriceId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TicketType_eventId_displayOrder_idx" ON "TicketType"("eventId", "displayOrder");
