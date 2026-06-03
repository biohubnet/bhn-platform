-- Public, no-login PLAYABLE share links for a Simulation, plus open
-- (anonymous, named) comments on the shared sim.
--
-- /share/sim/[token]               → playable guest view (client-side engine)
-- /api/simulator/share             → mint/reuse a link (any signed-in role)
-- /api/share/sim/[token]/comments  → public GET/POST, admin DELETE (soft-hide)

CREATE TABLE "SimulationShareToken" (
    "id"           TEXT         NOT NULL,
    "simulationId" TEXT         NOT NULL,
    "token"        TEXT         NOT NULL,
    "label"        TEXT,
    "createdById"  TEXT,
    "expiresAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimulationShareToken_token_key"
    ON "SimulationShareToken" ("token");

CREATE INDEX "SimulationShareToken_simulationId_createdAt_idx"
    ON "SimulationShareToken" ("simulationId", "createdAt");

ALTER TABLE "SimulationShareToken"
    ADD CONSTRAINT "SimulationShareToken_simulationId_fkey"
    FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SimulationComment" (
    "id"           TEXT         NOT NULL,
    "simulationId" TEXT         NOT NULL,
    "authorName"   TEXT         NOT NULL,
    "authorUserId" TEXT,
    "body"         TEXT         NOT NULL,
    "ip"           TEXT,
    "hidden"       BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimulationComment_simulationId_createdAt_idx"
    ON "SimulationComment" ("simulationId", "createdAt");

CREATE INDEX "SimulationComment_ip_createdAt_idx"
    ON "SimulationComment" ("ip", "createdAt");

ALTER TABLE "SimulationComment"
    ADD CONSTRAINT "SimulationComment_simulationId_fkey"
    FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
