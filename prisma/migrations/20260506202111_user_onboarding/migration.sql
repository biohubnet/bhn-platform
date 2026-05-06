-- DropIndex
DROP INDEX "course_embedding_hnsw";

-- DropIndex
DROP INDEX "pathway_embedding_hnsw";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "Pathway" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboarding" JSONB;

