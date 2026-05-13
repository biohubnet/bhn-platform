-- Rename the CRM_EP placeholder course to a user-facing title.
--
-- The course was created through the admin UI with a working-title
-- string ("CRM_EP", roughly "Customer Relationship Management — EP"
-- in the OBIO Entrepreneurship Pathway). A proper name was never
-- written in, so trainees see the slug-style placeholder on the
-- catalog. This migration upgrades it to a descriptive title that
-- reads naturally in the catalog and on a certificate.
--
-- Idempotent on rename: if the placeholder already got renamed by
-- hand (or a previous deploy ran this migration), no row matches
-- the WHERE and nothing changes. Safe to re-run.
--
-- We cover the realistic casing / separator variants we've seen
-- ("CRM_EP", "crm_ep", "CRM EP", "CRM-EP", etc.) so a typo at
-- creation time doesn't escape the rename.

UPDATE "Course"
SET title = 'Customer Relationship Management for Founders'
WHERE TRIM(title) IN (
  'CRM_EP', 'crm_ep', 'Crm_ep', 'CRM_ep',
  'CRM EP', 'crm ep', 'Crm Ep',
  'CRM-EP', 'crm-ep', 'Crm-Ep',
  'CRMEP',  'crmep',  'Crmep'
);
