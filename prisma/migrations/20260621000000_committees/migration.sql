-- Committee memberships — a per-user, per-committee side
-- relationship that grants additional capabilities on top of the
-- user's primary role.
--
-- Two committees ship initially:
--   • equip_review — reviews EQUIP funding applications. Gets
--                    read+write access to /admin/equip even if
--                    the user's primary role isn't admin.
--   • hqp          — Highly Qualified Personnel committee. Gets
--                    a welcome-screen badge + a committee menu.
--
-- The committee column is plain TEXT (not an enum) so adding a
-- third committee in the future is a code change to the helper
-- module, not a schema migration.

CREATE TABLE "CommitteeMembership" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "committee" TEXT NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt"    TIMESTAMP(3),
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CommitteeMembership_userId_committee_key"
  ON "CommitteeMembership"("userId", "committee");
CREATE INDEX "CommitteeMembership_committee_active_idx"
  ON "CommitteeMembership"("committee", "active");
ALTER TABLE "CommitteeMembership"
  ADD CONSTRAINT "CommitteeMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
