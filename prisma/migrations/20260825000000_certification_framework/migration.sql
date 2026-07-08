-- Certification framework: named, multi-level (Foundation / Practitioner /
-- Advanced) professional certifications. Fully additive — three new tables,
-- no changes to existing tables.

-- CreateTable
CREATE TABLE "CertificationProgram" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "discipline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationLevel" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "courseIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "credentialNumber" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CertificationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificationProgram_slug_key" ON "CertificationProgram"("slug");

-- CreateIndex
CREATE INDEX "CertificationLevel_programId_idx" ON "CertificationLevel"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationLevel_programId_tier_key" ON "CertificationLevel"("programId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationCredential_credentialNumber_key" ON "CertificationCredential"("credentialNumber");

-- CreateIndex
CREATE INDEX "CertificationCredential_userId_idx" ON "CertificationCredential"("userId");

-- CreateIndex
CREATE INDEX "CertificationCredential_programId_idx" ON "CertificationCredential"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationCredential_userId_levelId_key" ON "CertificationCredential"("userId", "levelId");

-- AddForeignKey
ALTER TABLE "CertificationLevel" ADD CONSTRAINT "CertificationLevel_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CertificationProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CertificationProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CertificationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
