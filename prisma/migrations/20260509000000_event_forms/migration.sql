-- CreateTable
CREATE TABLE "EventForm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventForm_slug_key" ON "EventForm"("slug");

-- CreateIndex
CREATE INDEX "EventFormSubmission_formId_createdAt_idx" ON "EventFormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "EventFormSubmission_email_idx" ON "EventFormSubmission"("email");

-- AddForeignKey
ALTER TABLE "EventFormSubmission" ADD CONSTRAINT "EventFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "EventForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
