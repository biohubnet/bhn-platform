-- Outreach campaigns: a planned, trackable cross-promotion push using one
-- email template against a target audience (a list, or null = whole directory).
-- The roster is derived live; sentPersonIds records who's been reached.

CREATE TABLE "OutreachCampaign" (
    "id"            TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "listId"        TEXT,
    "templateId"    TEXT         NOT NULL,
    "vars"          JSONB        NOT NULL,
    "sentPersonIds" JSONB        NOT NULL,
    "status"        TEXT         NOT NULL DEFAULT 'draft',
    "notes"         TEXT         NOT NULL DEFAULT '',
    "createdById"   TEXT,
    "createdByName" TEXT         NOT NULL DEFAULT 'BHN team',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachCampaign_createdAt_idx" ON "OutreachCampaign" ("createdAt");

ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
