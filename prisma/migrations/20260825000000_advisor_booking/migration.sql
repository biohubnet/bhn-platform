-- Advisor booking: 1:1 sessions offered alongside Learning Pathways.
-- Kept separate from Workshop / WorkshopBooking, which carry waitlists,
-- approval and symposium registration that an advisor chat does not.

CREATE TABLE "AdvisorSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "advisorName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdvisorBooking" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "topic" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvisorSession_startsAt_status_idx" ON "AdvisorSession"("startsAt", "status");
CREATE INDEX "AdvisorBooking_userId_status_idx" ON "AdvisorBooking"("userId", "status");
CREATE INDEX "AdvisorBooking_sessionId_status_idx" ON "AdvisorBooking"("sessionId", "status");
CREATE UNIQUE INDEX "AdvisorBooking_sessionId_userId_key" ON "AdvisorBooking"("sessionId", "userId");

ALTER TABLE "AdvisorSession" ADD CONSTRAINT "AdvisorSession_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdvisorBooking" ADD CONSTRAINT "AdvisorBooking_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "AdvisorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdvisorBooking" ADD CONSTRAINT "AdvisorBooking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
