-- Role-play simulator schema.
--
-- Adds two tables:
--   Simulation         — AI-generated template, cached by JD content hash
--                        so the same posting only pays one generation cost
--                        across the whole cohort.
--   SimulationAttempt  — per-trainee playthrough state. JSON columns hold
--                        the running stats + decision log so a single row
--                        captures everything we need to resume.
--
-- This file is hand-written because the existing migration history has
-- a drift bug that breaks shadow-DB replay (see
-- 20260513100000_drop_sandbox_kind, which UPDATEs a column the LATER
-- 20260516000000_sandbox_and_demo_accounts migration is the one to
-- create). Until that's fixed, `prisma migrate dev` can't be used.
-- Apply this file directly via `prisma db execute` and then mark it
-- as applied via `prisma migrate resolve --applied`.

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "jdSnippet" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT,
    "location" TEXT,
    "payload" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "generationMs" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAttempt" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 1,
    "scenarioIndex" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL,
    "log" JSONB NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "finalScore" INTEGER,
    "finalTier" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_sourceHash_key" ON "Simulation"("sourceHash");

-- CreateIndex
CREATE INDEX "Simulation_sourceUrl_idx" ON "Simulation"("sourceUrl");

-- CreateIndex
CREATE INDEX "Simulation_createdAt_idx" ON "Simulation"("createdAt");

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_updatedAt_idx" ON "SimulationAttempt"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SimulationAttempt_simulationId_idx" ON "SimulationAttempt"("simulationId");

-- AddForeignKey
ALTER TABLE "Simulation"
    ADD CONSTRAINT "Simulation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt"
    ADD CONSTRAINT "SimulationAttempt_simulationId_fkey"
    FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt"
    ADD CONSTRAINT "SimulationAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
