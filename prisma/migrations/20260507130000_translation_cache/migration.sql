-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Translation_hash_key" ON "Translation"("hash");

-- CreateIndex
CREATE INDEX "Translation_targetLang_idx" ON "Translation"("targetLang");
