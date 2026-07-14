-- Public, no-login share links for the EQUIP tracking report dossier.
-- Possession of the token URL grants read-only access to the dossier at
-- /share/equip-report/[token]; minting/revoking is admin-only.
CREATE TABLE "EquipReportShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipReportShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EquipReportShareToken_token_key" ON "EquipReportShareToken"("token");

CREATE INDEX "EquipReportShareToken_createdAt_idx" ON "EquipReportShareToken"("createdAt");
