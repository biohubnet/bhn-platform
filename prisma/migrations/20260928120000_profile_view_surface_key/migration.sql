-- Profile views: count each surface separately. The old key let one
-- viewer produce a single row per trainee per day, so a resume view and a
-- video-intro view on the same day collided and only the first counted.

-- DropIndex
DROP INDEX "ProfileView_userId_viewerId_day_key";

-- CreateIndex
CREATE UNIQUE INDEX "ProfileView_userId_viewerId_surface_day_key" ON "ProfileView"("userId", "viewerId", "surface", "day");

