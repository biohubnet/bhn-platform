-- Voice-confidence read + delivery metrics on each mock-interview answer.
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "confidence"   INTEGER;
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "wpm"          INTEGER;
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "fillerCount"  INTEGER;
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "deliveryNote" TEXT NOT NULL DEFAULT '';
