-- Course catalog filter facets
ALTER TABLE "Course"
  ADD COLUMN "topic"     TEXT,
  ADD COLUMN "delivery"  TEXT,
  ADD COLUMN "provider"  TEXT,
  ADD COLUMN "isSpecial" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Course_topic_idx"    ON "Course"("topic");
CREATE INDEX "Course_delivery_idx" ON "Course"("delivery");
CREATE INDEX "Course_provider_idx" ON "Course"("provider");

-- Employer role flags on User (the role itself is a free-text field;
-- nothing to migrate beyond letting it accept "employer").
ALTER TABLE "User"
  ADD COLUMN "allowPlatformContent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "employerCompany"      TEXT;
