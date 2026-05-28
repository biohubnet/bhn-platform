-- Event capacity cap + Registration-level waitlist.
--
-- BhnEvent gets a nullable maxAttendees cap (NULL = uncapped, the
-- symposium default) and a waitlistEnabled toggle that controls
-- behaviour when the cap is hit. Registration gets a waitlistPosition
-- that's set when registrationStatus is "waitlist" — auto-assigned by
-- the registration API and cleared on auto-promotion (after a
-- confirmed cancellation frees a seat).
--
-- The Registration.registrationStatus column already accepts arbitrary
-- strings, so no enum change is needed — code adds the new "waitlist"
-- value via the API layer.

ALTER TABLE "BhnEvent" ADD COLUMN "maxAttendees" INTEGER;
ALTER TABLE "BhnEvent" ADD COLUMN "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Registration" ADD COLUMN "waitlistPosition" INTEGER;

-- Helps the capacity-count query in the registration API (counts all
-- non-cancelled rows for an event).
CREATE INDEX "Registration_eventId_registrationStatus_waitlistPosition_idx"
  ON "Registration"("eventId", "registrationStatus", "waitlistPosition");
