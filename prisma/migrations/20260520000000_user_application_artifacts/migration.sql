-- Trainee-facing "My Application" artifacts. Persisted on the User
-- row so they survive across talent-application submissions and so
-- the trainee can manage them from a dedicated profile page rather
-- than only via the long talent-app form. The Talent Application
-- form will eventually pre-fill from these.
ALTER TABLE "User"
  ADD COLUMN "resumeUrl"            TEXT,
  ADD COLUMN "videoIntroUrl"        TEXT,
  ADD COLUMN "elevatorPitch"        TEXT,
  ADD COLUMN "applicationUpdatedAt" TIMESTAMP(3);
