-- 21 CFR Part 11 §11.50 + §11.70 — electronic signatures.
--
-- A signature is captured at the moment a learner completes a
-- regulated training event (typically a SCORM course or a graded
-- assessment in a GxP context). The record carries:
--   • signerId  — User who signed
--   • action    — what they're signing for (e.g. "training.complete")
--   • subject   — what the signature is bound to
--                 (assessmentAttemptId / moduleProgressId / courseId)
--   • meaning   — the human-readable attestation text the user saw
--                 ("I confirm I have read and understood …")
--   • performedAt — server timestamp; immutable
--   • method    — "password" (re-auth on signing) or "session"
--   • ipAddress / userAgent — defensible attestation context
--
-- §11.70 binding: signatures are linked to their electronic record
-- via subjectType + subjectId. We never delete a signature; the
-- associated record's onDelete=Cascade preserves nothing here, so
-- we keep the bind as plain string IDs and skip FK cascades — the
-- audit value is "what was signed when, even if the related record
-- was later removed." Subject lookup is best-effort.

CREATE TABLE "ElectronicSignature" (
  "id"           TEXT NOT NULL,
  "signerId"     TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "subjectType"  TEXT NOT NULL,
  "subjectId"    TEXT NOT NULL,
  "meaning"      TEXT NOT NULL,
  "performedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method"       TEXT NOT NULL DEFAULT 'session',
  "ipAddress"    TEXT,
  "userAgent"    TEXT,

  CONSTRAINT "ElectronicSignature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ElectronicSignature_signerId_performedAt_idx"
  ON "ElectronicSignature"("signerId", "performedAt");

CREATE INDEX "ElectronicSignature_subjectType_subjectId_idx"
  ON "ElectronicSignature"("subjectType", "subjectId");

ALTER TABLE "ElectronicSignature"
  ADD CONSTRAINT "ElectronicSignature_signerId_fkey"
  FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT;
