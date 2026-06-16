-- Per-contact intro history: when the introduction email was sent (null = the
-- contact is net-new and still needs an intro). Everyone who predates this
-- column was added/contacted before the campaigns feature and already knows us,
-- so backfill them to createdAt — they get the returning/thank-you campaign copy
-- rather than an introduction.
ALTER TABLE "OutreachPerson" ADD COLUMN "introSentAt" TIMESTAMP(3);
UPDATE "OutreachPerson" SET "introSentAt" = "createdAt";

-- Campaigns can carry a second template for contacts who already know us
-- (the "thanks for your earlier support" version).
ALTER TABLE "OutreachCampaign" ADD COLUMN "returningTemplateId" TEXT;
