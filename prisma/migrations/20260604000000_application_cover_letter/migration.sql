-- Cover-letter column on ApplicationStatus.
--
-- Distinct from `notes` (trainee-private). The cover letter is the
-- "tell us about yourself for this role" surface — trainee writes
-- it once at apply time + the employer reads it on the applicant
-- detail view.

ALTER TABLE "ApplicationStatus"
  ADD COLUMN "coverLetter" TEXT;
