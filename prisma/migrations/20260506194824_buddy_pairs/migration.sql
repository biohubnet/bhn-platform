-- CreateTable
CREATE TABLE "BuddyPair" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "focusType" TEXT,
    "focusId" TEXT,
    "goalNote" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,

    CONSTRAINT "BuddyPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyMessage" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "BuddyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuddyPair_partnerId_status_idx" ON "BuddyPair"("partnerId", "status");

-- CreateIndex
CREATE INDEX "BuddyPair_initiatorId_status_idx" ON "BuddyPair"("initiatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BuddyPair_initiatorId_partnerId_key" ON "BuddyPair"("initiatorId", "partnerId");

-- CreateIndex
CREATE INDEX "BuddyMessage_pairId_createdAt_idx" ON "BuddyMessage"("pairId", "createdAt");

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "BuddyPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

