-- Profile views: one row per employer, trainee and calendar day, so the
-- trainee dashboard can show "profile views in the past 30 days".
-- Written by POST /api/profile-views from a client effect, never during a
-- render. The unique key both dedupes and serves the per-trainee count.

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileView_userId_viewerId_day_key" ON "ProfileView"("userId", "viewerId", "day");

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

