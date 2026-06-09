-- Workspace → Marketing → Video Production. VideoProject holds Scripts;
-- Scripts carry sections, revisions (history/revert), comments, anonymous
-- collaborators, and public share-link tokens. All additive.

CREATE TABLE "VideoProject" (
    "id"          TEXT         NOT NULL,
    "category"    TEXT         NOT NULL DEFAULT 'marketing',
    "title"       TEXT         NOT NULL,
    "summary"     TEXT         NOT NULL DEFAULT '',
    "status"      TEXT         NOT NULL DEFAULT 'active',
    "isArchived"  BOOLEAN      NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoProject_category_isArchived_idx" ON "VideoProject" ("category", "isArchived");

CREATE TABLE "Script" (
    "id"          TEXT         NOT NULL,
    "projectId"   TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "format"      TEXT         NOT NULL DEFAULT 'sections',
    "richContent" JSONB,
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "isArchived"  BOOLEAN      NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Script_projectId_isArchived_idx" ON "Script" ("projectId", "isArchived");

CREATE TABLE "ScriptSection" (
    "id"        TEXT         NOT NULL,
    "scriptId"  TEXT         NOT NULL,
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "heading"   TEXT         NOT NULL DEFAULT '',
    "body"      TEXT         NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptSection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScriptSection_scriptId_order_idx" ON "ScriptSection" ("scriptId", "order");

CREATE TABLE "ScriptRevision" (
    "id"           TEXT         NOT NULL,
    "scriptId"     TEXT         NOT NULL,
    "authorUserId" TEXT,
    "authorName"   TEXT         NOT NULL DEFAULT 'Someone',
    "authorKind"   TEXT         NOT NULL DEFAULT 'anon',
    "snapshot"     JSONB        NOT NULL,
    "summary"      TEXT         NOT NULL DEFAULT '',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScriptRevision_scriptId_createdAt_idx" ON "ScriptRevision" ("scriptId", "createdAt");

CREATE TABLE "ScriptComment" (
    "id"              TEXT         NOT NULL,
    "scriptId"        TEXT         NOT NULL,
    "anchorSectionId" TEXT,
    "anchorFrom"      INTEGER,
    "anchorTo"        INTEGER,
    "parentId"        TEXT,
    "authorUserId"    TEXT,
    "authorName"      TEXT         NOT NULL DEFAULT 'Someone',
    "authorKind"      TEXT         NOT NULL DEFAULT 'anon',
    "body"            TEXT         NOT NULL,
    "status"          TEXT         NOT NULL DEFAULT 'open',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScriptComment_scriptId_createdAt_idx" ON "ScriptComment" ("scriptId", "createdAt");
CREATE INDEX "ScriptComment_parentId_idx" ON "ScriptComment" ("parentId");

CREATE TABLE "ScriptCollaborator" (
    "id"               TEXT         NOT NULL,
    "scriptId"         TEXT         NOT NULL,
    "name"             TEXT         NOT NULL,
    "editCount"        INTEGER      NOT NULL DEFAULT 0,
    "email"            TEXT,
    "convertedUserId"  TEXT,
    "offerDismissedAt" TIMESTAMP(3),
    "firstSeenAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptCollaborator_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScriptCollaborator_scriptId_lastSeenAt_idx" ON "ScriptCollaborator" ("scriptId", "lastSeenAt");

CREATE TABLE "ScriptShareToken" (
    "id"          TEXT         NOT NULL,
    "scriptId"    TEXT         NOT NULL,
    "token"       TEXT         NOT NULL,
    "label"       TEXT,
    "canEdit"     BOOLEAN      NOT NULL DEFAULT true,
    "expiresAt"   TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptShareToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScriptShareToken_token_key" ON "ScriptShareToken" ("token");
CREATE INDEX "ScriptShareToken_scriptId_createdAt_idx" ON "ScriptShareToken" ("scriptId", "createdAt");

-- Foreign keys (cascade so deleting a project/script sweeps its children).
ALTER TABLE "Script"             ADD CONSTRAINT "Script_projectId_fkey"            FOREIGN KEY ("projectId") REFERENCES "VideoProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptSection"      ADD CONSTRAINT "ScriptSection_scriptId_fkey"      FOREIGN KEY ("scriptId")  REFERENCES "Script" ("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptRevision"     ADD CONSTRAINT "ScriptRevision_scriptId_fkey"     FOREIGN KEY ("scriptId")  REFERENCES "Script" ("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptComment"      ADD CONSTRAINT "ScriptComment_scriptId_fkey"      FOREIGN KEY ("scriptId")  REFERENCES "Script" ("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptCollaborator" ADD CONSTRAINT "ScriptCollaborator_scriptId_fkey" FOREIGN KEY ("scriptId")  REFERENCES "Script" ("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptShareToken"   ADD CONSTRAINT "ScriptShareToken_scriptId_fkey"   FOREIGN KEY ("scriptId")  REFERENCES "Script" ("id")       ON DELETE CASCADE ON UPDATE CASCADE;
