-- CreateTable
CREATE TABLE "CourseFilterOption" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseFilterOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseFilterOption_type_value_key" ON "CourseFilterOption"("type", "value");

-- CreateIndex
CREATE INDEX "CourseFilterOption_type_sortOrder_idx" ON "CourseFilterOption"("type", "sortOrder");
