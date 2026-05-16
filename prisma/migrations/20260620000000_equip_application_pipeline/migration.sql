-- Equip — third BHN pillar (Engage / Experience / Equip).
--
-- Streamlines the application experience for the existing
-- VentureConnect (≤$5K, monthly cycle, conference / pitch /
-- networking support) and VentureLift (≤$25K, quarterly cycle,
-- accelerator + IP + prototype + commercialization roadmap)
-- funding streams. Replaces today's downloadable-PDF flow with a
-- fully in-platform wizard.
--
-- Two new tables:
--   • EquipApplication        — one row per draft / submission
--   • EquipApplicationMessage — reviewer ↔ applicant comment thread
--
-- Both cascade off User so the existing GDPR-style wipe path still
-- works without bespoke cleanup code.

-- ── EquipApplication ─────────────────────────────────────────────
CREATE TABLE "EquipApplication" (
  "id"                       TEXT PRIMARY KEY,
  "userId"                   TEXT NOT NULL,
  /// "venture_connect" | "venture_lift"
  "stream"                   TEXT NOT NULL,
  /// "draft" | "submitted" | "under_review" | "approved" | "rejected" | "funded"
  "status"                   TEXT NOT NULL DEFAULT 'draft',
  "requestedAmount"          DOUBLE PRECISION,
  "approvedAmount"           DOUBLE PRECISION,
  /// "grad" | "postdoc" | "research_associate" | "founder"
  "applicantType"            TEXT,
  /// Slug from the curated 14-institution list (see lib/equip/institutions.ts).
  "institution"              TEXT,
  /// Free-text for "Other" institution case.
  "institutionOther"         TEXT,
  /// "exploring" | "building" | "unsure" — used to route streams.
  "commercializationStage"   TEXT,
  /// Stream-specific form data. Shape lives in lib/equip/types.ts so
  /// reads on the client are typed; we keep it as JSON in the DB so
  /// we can iterate on questions without per-field migrations.
  "formData"                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  /// Array of { key, name, size, contentType, kind } — kind is the
  /// document role ("pitch_deck" | "prototype_photo" | "letter" |
  /// "video_pitch" | "other"). Mirrors the CreditApplication shape.
  "documents"                JSONB NOT NULL DEFAULT '[]'::jsonb,
  "reviewerId"               TEXT,
  "reviewerNote"             TEXT,
  "reviewedAt"               TIMESTAMP(3),
  "submittedAt"              TIMESTAMP(3),
  "decidedAt"                TIMESTAMP(3),
  "fundedAt"                 TIMESTAMP(3),
  "disbursementNote"         TEXT,
  /// Tagged true when any AI auto-fill action touched this draft
  /// (research-URL → narrative summary, suggested budget, etc.).
  /// Auditable so reviewers can spot fully AI-authored applications.
  "aiAssisted"               BOOLEAN NOT NULL DEFAULT FALSE,
  /// Post-approval check-ins. Shape: [{ id, title, dueOn, status,
  /// note, updatedAt }]. Lives in JSON so the templates can change
  /// without per-app schema work.
  "milestones"               JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL
);
CREATE INDEX "EquipApplication_userId_status_idx"     ON "EquipApplication"("userId", "status");
CREATE INDEX "EquipApplication_status_submittedAt_idx" ON "EquipApplication"("status", "submittedAt");
CREATE INDEX "EquipApplication_reviewerId_idx"        ON "EquipApplication"("reviewerId");
ALTER TABLE "EquipApplication"
  ADD CONSTRAINT "EquipApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipApplication"
  ADD CONSTRAINT "EquipApplication_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── EquipApplicationMessage ──────────────────────────────────────
CREATE TABLE "EquipApplicationMessage" (
  "id"            TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "body"          TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EquipApplicationMessage_applicationId_createdAt_idx"
  ON "EquipApplicationMessage"("applicationId", "createdAt");
ALTER TABLE "EquipApplicationMessage"
  ADD CONSTRAINT "EquipApplicationMessage_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "EquipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipApplicationMessage"
  ADD CONSTRAINT "EquipApplicationMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
