-- Structured showcase membership: single source of truth for which
-- group(s)/cohort(s) a person belongs to. Replaces the loose programSlug
-- match + free-text pills. Both FKs cascade so deleting a group cleanly
-- removes its memberships (no dangling roster rows).

-- CreateTable
CREATE TABLE "ShowcaseMembership" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseMembership_submissionId_groupId_key" ON "ShowcaseMembership"("submissionId", "groupId");

-- CreateIndex
CREATE INDEX "ShowcaseMembership_groupId_idx" ON "ShowcaseMembership"("groupId");

-- CreateIndex
CREATE INDEX "ShowcaseMembership_submissionId_idx" ON "ShowcaseMembership"("submissionId");

-- AddForeignKey
ALTER TABLE "ShowcaseMembership" ADD CONSTRAINT "ShowcaseMembership_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ShowcaseSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseMembership" ADD CONSTRAINT "ShowcaseMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ShowcaseGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one isHome membership per existing submission, from the group
-- whose slug == the submission's programSlug. Submissions whose programSlug
-- matches no group get no row (same visibility as before). Idempotent.
INSERT INTO "ShowcaseMembership" ("id", "submissionId", "groupId", "isHome", "createdAt")
SELECT 'cm' || replace(gen_random_uuid()::text, '-', ''),
       s."id", g."id", true, CURRENT_TIMESTAMP
FROM "ShowcaseSubmission" s
JOIN "ShowcaseGroup" g ON g."slug" = s."programSlug"
ON CONFLICT ("submissionId", "groupId") DO NOTHING;
