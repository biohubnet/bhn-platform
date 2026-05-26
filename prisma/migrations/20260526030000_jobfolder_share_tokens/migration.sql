-- Tokenised read-only share links for JobFolder.
-- /share/folder/[token] serves a no-login mentor-friendly view.

CREATE TABLE "JobFolderShareToken" (
    "id"        TEXT         NOT NULL,
    "folderId"  TEXT         NOT NULL,
    "token"     TEXT         NOT NULL,
    "label"     TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobFolderShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobFolderShareToken_token_key"
    ON "JobFolderShareToken" ("token");

CREATE INDEX "JobFolderShareToken_folderId_createdAt_idx"
    ON "JobFolderShareToken" ("folderId", "createdAt");

ALTER TABLE "JobFolderShareToken"
    ADD CONSTRAINT "JobFolderShareToken_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "JobFolder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
