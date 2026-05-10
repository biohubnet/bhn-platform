-- Merch fulfillment method.
--
-- Trainees default to picking up bundles at the BioHubNet office at
-- Leslie Dan Faculty of Pharmacy, U of T. If they're far from Toronto,
-- they can request mailing — admin then reviews and either ships or
-- converts back to PICKUP / CANCELLED.
--
-- "PICKUP" is the cheap path; SHIP_REQUEST means we'll review postage
-- before committing.

ALTER TABLE "MerchReward"
  ADD COLUMN "fulfillmentMethod" TEXT NOT NULL DEFAULT 'PICKUP';
