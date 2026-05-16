-- AI behaviour-assist pipeline.
--
-- Six new tables underpin the proactive-help system on /admin/assist:
--   • AssistEvent           raw signals (90-day retention)
--   • AssistDailyRollup     per-user-per-surface aggregates (12 mo)
--   • AssistWeeklySummary   LLM-written narrative summary (18 mo)
--   • AssistHint            queued / shown / dismissed hint
--   • AssistHintFeedback    implicit + explicit reception data
--   • AssistPreferences     per-user consent / mute / threshold
--
-- All FK to User with ON DELETE CASCADE.

-- ── AssistEvent ───────────────────────────────────────────────
CREATE TABLE "AssistEvent" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "ts"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kind"      TEXT NOT NULL,
  "surface"   TEXT,
  "target"    TEXT,
  "payload"   JSONB
);
CREATE INDEX "AssistEvent_userId_ts_idx"    ON "AssistEvent"("userId", "ts");
CREATE INDEX "AssistEvent_sessionId_ts_idx" ON "AssistEvent"("sessionId", "ts");
CREATE INDEX "AssistEvent_kind_ts_idx"      ON "AssistEvent"("kind", "ts");
ALTER TABLE "AssistEvent"
  ADD CONSTRAINT "AssistEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssistDailyRollup ─────────────────────────────────────────
CREATE TABLE "AssistDailyRollup" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "surface"      TEXT NOT NULL,
  "day"          TIMESTAMP(3) NOT NULL,
  "views"        INTEGER NOT NULL DEFAULT 0,
  "clicks"       INTEGER NOT NULL DEFAULT 0,
  "rageClicks"   INTEGER NOT NULL DEFAULT 0,
  "deadClicks"   INTEGER NOT NULL DEFAULT 0,
  "formAbandons" INTEGER NOT NULL DEFAULT 0,
  "errors"       INTEGER NOT NULL DEFAULT 0,
  "dwellMs"      INTEGER NOT NULL DEFAULT 0,
  "completed"    BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "AssistDailyRollup_userId_surface_day_key" ON "AssistDailyRollup"("userId", "surface", "day");
CREATE INDEX "AssistDailyRollup_userId_day_idx"               ON "AssistDailyRollup"("userId", "day");
CREATE INDEX "AssistDailyRollup_day_idx"                      ON "AssistDailyRollup"("day");
ALTER TABLE "AssistDailyRollup"
  ADD CONSTRAINT "AssistDailyRollup_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssistWeeklySummary ───────────────────────────────────────
CREATE TABLE "AssistWeeklySummary" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "summary"   TEXT NOT NULL,
  "stuckOn"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AssistWeeklySummary_userId_weekStart_key" ON "AssistWeeklySummary"("userId", "weekStart");
CREATE INDEX "AssistWeeklySummary_userId_weekStart_idx"        ON "AssistWeeklySummary"("userId", "weekStart");
CREATE INDEX "AssistWeeklySummary_weekStart_idx"               ON "AssistWeeklySummary"("weekStart");
ALTER TABLE "AssistWeeklySummary"
  ADD CONSTRAINT "AssistWeeklySummary_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssistHint ────────────────────────────────────────────────
CREATE TABLE "AssistHint" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "helpKey"     TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "ctaLabel"    TEXT,
  "ctaHref"     TEXT,
  "surface"     TEXT,
  "triggeredBy" TEXT NOT NULL,
  "confidence"  DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "shownAt"     TIMESTAMP(3),
  "resolvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AssistHint_userId_status_idx"     ON "AssistHint"("userId", "status");
CREATE INDEX "AssistHint_userId_createdAt_idx"  ON "AssistHint"("userId", "createdAt");
CREATE INDEX "AssistHint_helpKey_status_idx"    ON "AssistHint"("helpKey", "status");
ALTER TABLE "AssistHint"
  ADD CONSTRAINT "AssistHint_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssistHintFeedback ────────────────────────────────────────
CREATE TABLE "AssistHintFeedback" (
  "id"     TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "hintId" TEXT NOT NULL,
  "kind"   TEXT NOT NULL,
  "rating" INTEGER,
  "ts"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AssistHintFeedback_hintId_kind_idx" ON "AssistHintFeedback"("hintId", "kind");
CREATE INDEX "AssistHintFeedback_userId_ts_idx"   ON "AssistHintFeedback"("userId", "ts");
ALTER TABLE "AssistHintFeedback"
  ADD CONSTRAINT "AssistHintFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistHintFeedback"
  ADD CONSTRAINT "AssistHintFeedback_hintId_fkey"
  FOREIGN KEY ("hintId") REFERENCES "AssistHint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssistPreferences ─────────────────────────────────────────
CREATE TABLE "AssistPreferences" (
  "userId"              TEXT PRIMARY KEY,
  "consented"           BOOLEAN NOT NULL DEFAULT false,
  "consentedAt"         TIMESTAMP(3),
  "hintsDisabled"       BOOLEAN NOT NULL DEFAULT false,
  "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
  "suppressUntil"       TIMESTAMP(3),
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "AssistPreferences"
  ADD CONSTRAINT "AssistPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
