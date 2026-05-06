-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "embeddedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pathway" ADD COLUMN     "embeddedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIInteraction_createdAt_idx" ON "AIInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "AIInteraction_kind_createdAt_idx" ON "AIInteraction"("kind", "createdAt");


-- Enable pgvector for semantic search and recommendations.
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding columns (managed outside Prisma since prisma-client-js doesn't
-- yet first-class the vector type). 384 dims = bge-small-en-v1.5.
ALTER TABLE "Course"  ADD COLUMN IF NOT EXISTS "embedding" vector(384);
ALTER TABLE "Pathway" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
ALTER TABLE "Module"  ADD COLUMN IF NOT EXISTS "embedding" vector(384);

-- HNSW indexes for fast cosine similarity search.
CREATE INDEX IF NOT EXISTS course_embedding_hnsw  ON "Course"  USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS pathway_embedding_hnsw ON "Pathway" USING hnsw ("embedding" vector_cosine_ops);
