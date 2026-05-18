-- Course favorites — user-side bookmarks for catalog cards.
--
-- A row exists iff a User has tapped the heart icon on a Course
-- card. The same heart removes the row when re-tapped. Unique
-- composite key (userId, courseId) so we can use upsert / safe
-- delete-by-key, and per-side indexes for the two common reads:
--   - "is this course favorited by THIS user?" (filtered by user)
--   - "how many favorites does this course have?" (filtered by course)

CREATE TABLE "CourseFavorite" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "courseId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CourseFavorite_userId_courseId_key"
  ON "CourseFavorite"("userId", "courseId");
CREATE INDEX "CourseFavorite_userId_idx"
  ON "CourseFavorite"("userId");
CREATE INDEX "CourseFavorite_courseId_idx"
  ON "CourseFavorite"("courseId");

ALTER TABLE "CourseFavorite"
  ADD CONSTRAINT "CourseFavorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFavorite"
  ADD CONSTRAINT "CourseFavorite_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
