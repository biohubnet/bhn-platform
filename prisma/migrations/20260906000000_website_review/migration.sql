-- Website review: threaded comments anchored to elements of a live page,
-- exported as a Markdown brief for an AI coding agent.
--
-- Anchors are stored at four decreasing precisions (quote, key, path,
-- WPBakery block) so a comment survives the page being edited; a later
-- capture that can't re-locate one flips anchorState to 'orphaned'
-- rather than silently re-attaching it to the wrong element.

CREATE TABLE "PageReview" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "round" INTEGER NOT NULL DEFAULT 1,
    "snapshotHtml" TEXT,
    "snapshotAt" TIMESTAMP(3),
    "shareToken" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageComment" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "parentId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "anchorQuote" TEXT,
    "anchorKey" TEXT,
    "anchorPath" TEXT,
    "anchorBlock" TEXT,
    "anchorState" TEXT NOT NULL DEFAULT 'found',
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Someone',
    "authorKind" TEXT NOT NULL DEFAULT 'user',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageReview_shareToken_key" ON "PageReview"("shareToken");

CREATE INDEX "PageReview_status_updatedAt_idx" ON "PageReview"("status", "updatedAt");

CREATE INDEX "PageComment_reviewId_createdAt_idx" ON "PageComment"("reviewId", "createdAt");

CREATE INDEX "PageComment_parentId_idx" ON "PageComment"("parentId");

ALTER TABLE "PageComment" ADD CONSTRAINT "PageComment_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "PageReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
