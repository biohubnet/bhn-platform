-- Workspace → File Sharing. Internal-team file library, sibling of
-- Marketing → Video Production. Bytes live in R2 under an unguessable
-- 128-bit-token key (same model as form uploads); this table is the
-- metadata + the share-link source of truth. All additive.

CREATE TABLE "SharedFile" (
    "id"          TEXT         NOT NULL,
    "category"    TEXT         NOT NULL DEFAULT 'file-sharing',
    "title"       TEXT         NOT NULL,
    "description" TEXT         NOT NULL DEFAULT '',
    "storageKey"  TEXT         NOT NULL DEFAULT '',
    "fileName"    TEXT         NOT NULL DEFAULT '',
    "mimeType"    TEXT         NOT NULL DEFAULT '',
    "sizeBytes"   INTEGER      NOT NULL DEFAULT 0,
    "status"      TEXT         NOT NULL DEFAULT 'active',
    "isArchived"  BOOLEAN      NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SharedFile_category_isArchived_idx" ON "SharedFile" ("category", "isArchived");
