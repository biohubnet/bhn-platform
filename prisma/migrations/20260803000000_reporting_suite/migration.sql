-- Reporting suite — HR/Talent reports (/employer/reports).
-- Additive + nullable so the migration is reversible. Adds:
--   • source attribution on applications (captured at apply time)
--   • a DEI-reporting gate on Company (off by default)
--   • HiringTarget (OKRs), RecruitingCost (cost-per-hire),
--     ApplicationDemographics (voluntary self-ID), and a typed
--     ApplicationStatusHistory (cohort funnel + cycle time).

-- ── ApplicationStatus: source attribution ──
ALTER TABLE "ApplicationStatus" ADD COLUMN "source" TEXT;
ALTER TABLE "ApplicationStatus" ADD COLUMN "sourceDetail" TEXT;
CREATE INDEX "ApplicationStatus_postingId_source_idx" ON "ApplicationStatus"("postingId", "source");

-- ── Company: DEI reporting gate (off until legal sign-off + opt-in) ──
ALTER TABLE "Company" ADD COLUMN "deiReportingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ── HiringTarget ──
CREATE TABLE "HiringTarget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingId" TEXT,
    "metricKey" TEXT NOT NULL,
    "targetValue" DECIMAL(12,2) NOT NULL,
    "comparator" TEXT NOT NULL DEFAULT 'gte',
    "atRiskBand" DECIMAL(4,3),
    "period" TEXT NOT NULL DEFAULT 'quarter',
    "ownerId" TEXT,
    "note" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HiringTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HiringTarget_companyId_postingId_metricKey_period_key" ON "HiringTarget"("companyId", "postingId", "metricKey", "period");
CREATE INDEX "HiringTarget_companyId_metricKey_idx" ON "HiringTarget"("companyId", "metricKey");
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── RecruitingCost ──
CREATE TABLE "RecruitingCost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingId" TEXT,
    "costType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecruitingCost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecruitingCost_companyId_incurredAt_idx" ON "RecruitingCost"("companyId", "incurredAt");
CREATE INDEX "RecruitingCost_postingId_idx" ON "RecruitingCost"("postingId");
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ApplicationDemographics (voluntary, consent-gated self-ID) ──
CREATE TABLE "ApplicationDemographics" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,
    "raceEthnicity" TEXT,
    "disabilityStatus" TEXT,
    "veteranStatus" TEXT,
    "indigenousStatus" TEXT,
    "consentedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationDemographics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicationDemographics_applicationStatusId_key" ON "ApplicationDemographics"("applicationStatusId");
ALTER TABLE "ApplicationDemographics" ADD CONSTRAINT "ApplicationDemographics_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ApplicationStatusHistory (typed transition stream) ──
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "actorId" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApplicationStatusHistory_postingId_toStage_changedAt_idx" ON "ApplicationStatusHistory"("postingId", "toStage", "changedAt");
CREATE INDEX "ApplicationStatusHistory_applicationStatusId_changedAt_idx" ON "ApplicationStatusHistory"("applicationStatusId", "changedAt");
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
