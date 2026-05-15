-- Pan + zoom transform applied to the company logo inside its
-- shape mask. JSON blob: { offsetX, offsetY, scale }. Nullable —
-- absence = default (0, 0, 1). Settable from /employer's Edit
-- Profile modal (Crop & centre section).

ALTER TABLE "User"
  ADD COLUMN "companyLogoTransform" JSONB;
