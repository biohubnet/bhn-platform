-- Live-presence for collaborative script editing. One row per active editor
-- per script, refreshed by a client heartbeat; powers the near-real-time
-- "who's here + editing which section" colour highlights.

CREATE TABLE "ScriptPresence" (
    "id"         TEXT         NOT NULL,
    "scriptId"   TEXT         NOT NULL,
    "editorKey"  TEXT         NOT NULL,
    "name"       TEXT         NOT NULL DEFAULT 'Someone',
    "color"      TEXT         NOT NULL DEFAULT '#3b82f6',
    "activeSid"  TEXT,
    "recentSids" TEXT         NOT NULL DEFAULT '',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptPresence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScriptPresence_scriptId_editorKey_key" ON "ScriptPresence" ("scriptId", "editorKey");
CREATE INDEX "ScriptPresence_scriptId_lastSeenAt_idx" ON "ScriptPresence" ("scriptId", "lastSeenAt");

ALTER TABLE "ScriptPresence" ADD CONSTRAINT "ScriptPresence_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
