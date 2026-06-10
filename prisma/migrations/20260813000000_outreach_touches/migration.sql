-- Outreach reach-out history: one row per logged touch (when / what / who),
-- attached to the person, optionally tied to the list it was made for.

CREATE TABLE "OutreachTouch" (
    "id"         TEXT         NOT NULL,
    "personId"   TEXT         NOT NULL,
    "listId"     TEXT,
    "kind"       TEXT         NOT NULL DEFAULT 'email',
    "note"       TEXT         NOT NULL DEFAULT '',
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byId"       TEXT,
    "byName"     TEXT         NOT NULL DEFAULT 'BHN team',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachTouch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutreachTouch_personId_happenedAt_idx" ON "OutreachTouch" ("personId", "happenedAt");

ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "OutreachPerson" ("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_listId_fkey"   FOREIGN KEY ("listId")   REFERENCES "OutreachList" ("id")   ON DELETE SET NULL ON UPDATE CASCADE;
