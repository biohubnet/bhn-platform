-- Mock Interview practice: a session + per-question answers (transcript,
-- score, feedback). Voice (Whisper STT) is optional; typing always works.

CREATE TABLE "MockInterview" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "role"         TEXT         NOT NULL,
    "context"      TEXT         NOT NULL DEFAULT '',
    "status"       TEXT         NOT NULL DEFAULT 'in_progress',
    "overallScore" INTEGER,
    "summary"      TEXT         NOT NULL DEFAULT '',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MockInterview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MockInterview_userId_createdAt_idx" ON "MockInterview" ("userId", "createdAt");

CREATE TABLE "MockInterviewAnswer" (
    "id"           TEXT         NOT NULL,
    "interviewId"  TEXT         NOT NULL,
    "order"        INTEGER      NOT NULL,
    "question"     TEXT         NOT NULL,
    "questionKind" TEXT         NOT NULL DEFAULT 'behavioral',
    "transcript"   TEXT         NOT NULL DEFAULT '',
    "inputMode"    TEXT         NOT NULL DEFAULT 'text',
    "score"        INTEGER,
    "feedback"     TEXT         NOT NULL DEFAULT '',
    "strengths"    JSONB        NOT NULL DEFAULT '[]',
    "improvements" JSONB        NOT NULL DEFAULT '[]',
    "answeredAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MockInterviewAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MockInterviewAnswer_interviewId_order_idx" ON "MockInterviewAnswer" ("interviewId", "order");

ALTER TABLE "MockInterviewAnswer" ADD CONSTRAINT "MockInterviewAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "MockInterview" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
