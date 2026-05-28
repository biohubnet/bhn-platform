-- SMS reminders — capture an optional phone number on registration
-- plus an explicit opt-in toggle. User.phone already exists on the
-- platform side; this migration is just the Registration-side data
-- for guests + the opt-in flag that gates SMS sends for both paths.

ALTER TABLE "Registration" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "Registration" ADD COLUMN "smsOptIn" BOOLEAN NOT NULL DEFAULT false;
