-- Re-enable pgvector and re-add columns + HNSW indexes that were inadvertently
-- dropped by the previous migration. Schema now declares these via
-- Unsupported("vector(384)") so future diffs leave them alone.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Course"  ADD COLUMN IF NOT EXISTS "embedding" vector(384);
ALTER TABLE "Pathway" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
ALTER TABLE "Module"  ADD COLUMN IF NOT EXISTS "embedding" vector(384);

CREATE INDEX IF NOT EXISTS course_embedding_hnsw  ON "Course"  USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS pathway_embedding_hnsw ON "Pathway" USING hnsw ("embedding" vector_cosine_ops);
