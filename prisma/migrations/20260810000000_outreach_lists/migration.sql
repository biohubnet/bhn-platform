-- Workspace → Marketing → Outreach: cross-promotion contact lists with
-- editable per-list columns and per-contact added-by attribution.

CREATE TABLE "OutreachList" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT         NOT NULL DEFAULT '',
    "columns"     JSONB        NOT NULL,
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachList_order_idx" ON "OutreachList" ("order");

CREATE TABLE "OutreachContact" (
    "id"          TEXT         NOT NULL,
    "listId"      TEXT         NOT NULL,
    "values"      JSONB        NOT NULL,
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "addedById"   TEXT,
    "addedByName" TEXT         NOT NULL DEFAULT 'BHN team',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachContact_listId_order_idx" ON "OutreachContact" ("listId", "order");

ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
