-- Newsletter workshop: colleagues drop raw contributions into a monthly
-- issue; the AI normalises each into structured layout fields and a
-- deterministic renderer emits the Mailchimp-safe HTML.
--
-- Sections are a commented String (engage | experience | equip | event),
-- matching the schema-wide convention of no Prisma enums.

CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateline" TEXT NOT NULL,
    "preheader" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "renderedHtml" TEXT,
    "renderedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterPiece" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "rawBody" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterPiece_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsletterIssue_status_createdAt_idx" ON "NewsletterIssue"("status", "createdAt");

-- The list query is always "pieces of this issue, grouped by section,
-- in position order" — one composite index covers it.
CREATE INDEX "NewsletterPiece_issueId_section_position_idx" ON "NewsletterPiece"("issueId", "section", "position");

ALTER TABLE "NewsletterPiece" ADD CONSTRAINT "NewsletterPiece_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
