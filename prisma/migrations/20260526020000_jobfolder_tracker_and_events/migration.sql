-- ─────────────────────────────────────────────────────────────────
-- Job folder — notes, application tracker fields, and lifecycle
-- events.
--
-- Six new optional columns on JobFolder (free-text notes + five
-- application-tracker fields) and a new JobFolderEvent table that
-- auto-logs lifecycle changes for the Timeline tab.
-- ─────────────────────────────────────────────────────────────────

-- New JobFolder columns
ALTER TABLE "JobFolder"
    ADD COLUMN "notes"           TEXT NOT NULL DEFAULT '',
    ADD COLUMN "applicationUrl"  TEXT,
    ADD COLUMN "appliedAt"       TIMESTAMP(3),
    ADD COLUMN "deadline"        TIMESTAMP(3),
    ADD COLUMN "recruiterName"   TEXT,
    ADD COLUMN "recruiterEmail"  TEXT,
    ADD COLUMN "referredBy"      TEXT;

CREATE INDEX "JobFolder_userId_deadline_idx"
    ON "JobFolder" ("userId", "deadline");

-- Lifecycle event log
CREATE TABLE "JobFolderEvent" (
    "id"        TEXT         NOT NULL,
    "folderId"  TEXT         NOT NULL,
    "kind"      TEXT         NOT NULL,
    "body"      TEXT         NOT NULL,
    "payload"   JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobFolderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobFolderEvent_folderId_createdAt_idx"
    ON "JobFolderEvent" ("folderId", "createdAt");

ALTER TABLE "JobFolderEvent"
    ADD CONSTRAINT "JobFolderEvent_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "JobFolder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
