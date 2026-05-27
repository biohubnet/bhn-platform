-- Registration: support public registration without a platform account.
--
-- Drops the NOT NULL constraint on userId and adds three guest-* fields
-- so people can register for events (e.g. an online info session) without
-- creating a User row. Idempotency for guests is enforced by a new
-- (eventId, guestEmail) unique index — case-folded at the application
-- layer so Foo@Bar.com and foo@bar.com don't slip past it.

-- Make userId nullable.
ALTER TABLE "Registration" ALTER COLUMN "userId" DROP NOT NULL;

-- Add the three guest fields.
ALTER TABLE "Registration" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Registration" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Registration" ADD COLUMN "guestOrganization" TEXT;

-- New unique index for guest idempotency.
-- Multiple registrations per event are still possible when guestEmail
-- is NULL (because SQL treats NULL != NULL in unique constraints), so
-- this only blocks duplicate guest emails — signed-in registrations
-- are unaffected and still use the existing (eventId, userId) unique.
CREATE UNIQUE INDEX "Registration_eventId_guestEmail_key" ON "Registration"("eventId", "guestEmail");
