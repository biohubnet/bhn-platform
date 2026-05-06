-- AlterTable
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 200;

-- CreateTable
CREATE TABLE "CreditApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAmount" DOUBLE PRECISION NOT NULL DEFAULT 4800,
    "approvedAmount" DOUBLE PRECISION,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "title" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "useCase" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditApplication_status_submittedAt_idx" ON "CreditApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "CreditApplication_userId_submittedAt_idx" ON "CreditApplication"("userId", "submittedAt");

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

