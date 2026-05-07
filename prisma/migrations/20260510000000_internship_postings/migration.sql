-- CreateTable
CREATE TABLE "InternshipPosting" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "hours" TEXT,
    "location" TEXT,
    "type" TEXT,
    "compensation" TEXT,
    "deadline" TIMESTAMP(3),
    "keySkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "positionDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternshipPosting_status_createdAt_idx" ON "InternshipPosting"("status", "createdAt");
