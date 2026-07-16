-- ScormSession had no index but its primary key, so the three trainee hot paths
-- (dashboard "continue learning", gradebook, SCORM player + /api/scorm/session)
-- sequential-scanned the whole table on every page view. Cost scaled with total
-- rows across ALL users while request rate scales with user count — superlinear
-- degradation, and the table only grows (nothing prunes superseded attempts).
--
-- Plain CREATE INDEX (not CONCURRENTLY): Prisma runs each migration inside a
-- transaction, and CREATE INDEX CONCURRENTLY cannot run in a transaction block.
-- At this table's size the build is sub-second and only briefly blocks writes.
-- If this table has grown large by the time you read this, build these by hand
-- with CREATE INDEX CONCURRENTLY outside Prisma instead.

-- where userId, order by updatedAt desc, take 3   → dashboard
CREATE INDEX "ScormSession_userId_updatedAt_idx" ON "ScormSession"("userId", "updatedAt");

-- where userId+packageId, order by attemptNumber desc → player, /api/scorm/session
-- where userId, order by packageId asc, attemptNumber asc → gradebook
CREATE INDEX "ScormSession_userId_packageId_attemptNumber_idx" ON "ScormSession"("userId", "packageId", "attemptNumber");
