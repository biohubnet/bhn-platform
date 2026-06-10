-- Outreach v2: central contact directory. One OutreachPerson per human
-- (shared fields), OutreachMembership links them into lists (per-list
-- fields). Legacy OutreachContact rows migrate at runtime.

CREATE TABLE "OutreachPerson" (
    "id"          TEXT         NOT NULL,
    "values"      JSONB        NOT NULL,
    "addedById"   TEXT,
    "addedByName" TEXT         NOT NULL DEFAULT 'BHN team',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachPerson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutreachMembership" (
    "id"          TEXT         NOT NULL,
    "listId"      TEXT         NOT NULL,
    "personId"    TEXT         NOT NULL,
    "values"      JSONB        NOT NULL,
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "addedById"   TEXT,
    "addedByName" TEXT         NOT NULL DEFAULT 'BHN team',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutreachMembership_listId_personId_key" ON "OutreachMembership" ("listId", "personId");
CREATE INDEX "OutreachMembership_listId_order_idx" ON "OutreachMembership" ("listId", "order");

ALTER TABLE "OutreachMembership" ADD CONSTRAINT "OutreachMembership_listId_fkey"   FOREIGN KEY ("listId")   REFERENCES "OutreachList" ("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutreachMembership" ADD CONSTRAINT "OutreachMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "OutreachPerson" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
