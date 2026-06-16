-- Human-in-the-loop on AI calls: end-user thumbs rating, model/heuristic
-- confidence, and a review-queue flag/state for low-rated or low-confidence
-- answers. answerExcerpt is kept only for flagged calls so a reviewer has context.
ALTER TABLE "AIInteraction" ADD COLUMN "userRating"       INTEGER;
ALTER TABLE "AIInteraction" ADD COLUMN "confidence"       DOUBLE PRECISION;
ALTER TABLE "AIInteraction" ADD COLUMN "flaggedForReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AIInteraction" ADD COLUMN "reviewStatus"     TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN "reviewNote"       TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN "reviewedById"     TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN "reviewedAt"       TIMESTAMP(3);
ALTER TABLE "AIInteraction" ADD COLUMN "answerExcerpt"    TEXT;

CREATE INDEX "AIInteraction_flaggedForReview_reviewStatus_idx" ON "AIInteraction" ("flaggedForReview", "reviewStatus");
