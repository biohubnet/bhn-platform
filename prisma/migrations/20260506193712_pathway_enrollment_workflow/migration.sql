-- AlterTable
ALTER TABLE "Pathway" ADD COLUMN     "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "enrollmentClosesAt" TIMESTAMP(3),
ADD COLUMN     "enrollmentOpensAt" TIMESTAMP(3),
ADD COLUMN     "enrollmentStatus" TEXT NOT NULL DEFAULT 'open';

-- AlterTable
ALTER TABLE "PathwayEnrollment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "requestReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "reviewerNote" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "PathwayEnrollment_pathwayId_status_enrolledAt_idx" ON "PathwayEnrollment"("pathwayId", "status", "enrolledAt");


-- Migrate any pre-existing "active" pathway enrollments to "approved"
UPDATE "PathwayEnrollment" SET "status" = 'approved', "approvedAt" = "enrolledAt"
WHERE "status" = 'active';
