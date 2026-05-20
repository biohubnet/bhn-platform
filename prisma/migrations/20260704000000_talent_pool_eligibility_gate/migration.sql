-- Talent-pool eligibility gate.
--
-- Adds a second human-approval step on top of the existing
-- reviewStatus. Employers only see EventFormSubmission rows where
-- eligibilityApprovedAt IS NOT NULL.

ALTER TABLE "EventFormSubmission"
  ADD COLUMN "eligibilityApprovedAt" TIMESTAMP(3),
  ADD COLUMN "eligibilityApprovedBy" TEXT,
  ADD COLUMN "eligibilityNote"       TEXT;

-- Supporting index for the employer-facing query
-- "approved AND eligibility-checked AND haven't left".
CREATE INDEX "EventFormSubmission_formId_reviewStatus_eligibilityApprovedAt_idx"
  ON "EventFormSubmission" ("formId", "reviewStatus", "eligibilityApprovedAt", "leftPoolAt");
