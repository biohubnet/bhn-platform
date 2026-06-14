-- Voice-coach read (tone / nerves / stumbles) + stumble count per answer.
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "voice" JSONB;
ALTER TABLE "MockInterviewAnswer" ADD COLUMN "stumbleCount" INTEGER;
