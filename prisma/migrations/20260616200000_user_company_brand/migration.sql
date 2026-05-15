-- Per-company brand tokens for the employer profile hero. JSON
-- blob storing { primary, secondary, accent, style }. Settable
-- from /employer's Edit Profile modal → Brand colours. Populated
-- by the brand-fetch endpoint (mechanical signals + AI) or by
-- hand. Nullable — absence = use the platform default gradient.

ALTER TABLE "User"
  ADD COLUMN "companyBrand" JSONB;
