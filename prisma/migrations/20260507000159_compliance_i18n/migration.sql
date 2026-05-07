-- DropIndex
DROP INDEX "course_embedding_hnsw";

-- DropIndex
DROP INDEX "pathway_embedding_hnsw";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consent" JSONB,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "detail" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSubjectRequest_userId_createdAt_idx" ON "DataSubjectRequest"("userId", "createdAt");

