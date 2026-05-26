-- ─────────────────────────────────────────────────────────────────
-- Job folder ↔ Simulation request link
--
-- Adds an optional FK on JobFolder pointing at SimulationRequest, so
-- a trainee can attach a role-play sim to a folder alongside the
-- existing JD / resume / cover letter / interview prep tabs. ON
-- DELETE SET NULL — deleting the request leaves the folder intact
-- so the trainee doesn't silently lose their JD + cover letter.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE "JobFolder"
    ADD COLUMN "simulationRequestId" TEXT;

ALTER TABLE "JobFolder"
    ADD CONSTRAINT "JobFolder_simulationRequestId_fkey"
    FOREIGN KEY ("simulationRequestId") REFERENCES "SimulationRequest"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "JobFolder_simulationRequestId_idx"
    ON "JobFolder" ("simulationRequestId");
