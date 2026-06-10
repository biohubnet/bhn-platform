-- Public share links for outreach lists + named anonymous collaborators.

CREATE TABLE "OutreachShareToken" (
    "id"          TEXT         NOT NULL,
    "listId"      TEXT         NOT NULL,
    "token"       TEXT         NOT NULL,
    "label"       TEXT,
    "canEdit"     BOOLEAN      NOT NULL DEFAULT true,
    "expiresAt"   TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachShareToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutreachShareToken_token_key" ON "OutreachShareToken" ("token");
CREATE INDEX "OutreachShareToken_listId_createdAt_idx" ON "OutreachShareToken" ("listId", "createdAt");

CREATE TABLE "OutreachCollaborator" (
    "id"          TEXT         NOT NULL,
    "listId"      TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachCollaborator_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachCollaborator_listId_lastSeenAt_idx" ON "OutreachCollaborator" ("listId", "lastSeenAt");

ALTER TABLE "OutreachShareToken"   ADD CONSTRAINT "OutreachShareToken_listId_fkey"   FOREIGN KEY ("listId") REFERENCES "OutreachList" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutreachCollaborator" ADD CONSTRAINT "OutreachCollaborator_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
