-- Events module — adds the 12 tables that power the BHN Annual
-- Symposium & Training Week. Single-tenant by design (no tenantId
-- fields). Replaces the external WordPress page + Luma registration
-- with in-platform models.
--
-- Hand-crafted SQL because `prisma migrate dev` requires the prod DB
-- to be in lock-step with migration history, and this codebase has
-- known pgvector-index drift on Course/Pathway that is managed via
-- raw SQL outside the Prisma migrator. Modelled on the prior
-- migrations in this repo (merch_rewards, launch_checklist_state).
--
-- IMPORTANT: this migration does NOT modify any existing table.
-- Back-relations added to the User model in the Prisma schema do not
-- correspond to DB columns — relation fields from the parent side
-- are virtual in Prisma. The FK columns sit on the new child tables.
--
-- Cascade chain
--   BhnEvent → Workshop / SymposiumSession / Speaker / Sponsor /
--              Registration                              (Cascade)
--   Workshop → WorkshopBooking                           (Cascade)
--   SymposiumSession → SymposiumSessionSpeaker /
--                      PersonalAgendaEntry /
--                      SymposiumQuestion / Poll          (Cascade)
--   Speaker → SymposiumSessionSpeaker                    (Cascade)
--   SymposiumQuestion → SymposiumQuestionVote            (Cascade)
--   Poll → PollResponse                                  (Cascade)
--
-- User FKs
--   Registration.userId, WorkshopBooking.userId      → ON DELETE RESTRICT
--     (audit-preserving — matches ElectronicSignature.signer)
--   PersonalAgendaEntry.userId, SymposiumQuestion.userId,
--   SymposiumQuestionVote.userId, PollResponse.userId → ON DELETE CASCADE
--     (no audit value in retaining these rows after the user is gone)


-- ════════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════════

CREATE TABLE "BhnEvent" (
  "id"                   TEXT NOT NULL,
  "slug"                 TEXT NOT NULL,
  "title"                TEXT NOT NULL,
  "tagline"              TEXT,
  "description"          TEXT,
  "startDate"            TIMESTAMP(3) NOT NULL,
  "endDate"              TIMESTAMP(3) NOT NULL,
  "timezone"             TEXT NOT NULL DEFAULT 'America/Toronto',
  "mainVenueName"        TEXT,
  "mainVenueAddress"     TEXT,
  "mainVenueMapUrl"      TEXT,
  "coverImageUrl"        TEXT,
  "brandingJson"         JSONB,
  "status"               TEXT NOT NULL DEFAULT 'draft',
  "registrationOpensAt"  TIMESTAMP(3),
  "registrationClosesAt" TIMESTAMP(3),
  "accommodationInfo"    TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BhnEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BhnEvent_slug_key" ON "BhnEvent"("slug");
CREATE INDEX "BhnEvent_status_idx" ON "BhnEvent"("status");


CREATE TABLE "Workshop" (
  "id"                  TEXT NOT NULL,
  "eventId"             TEXT NOT NULL,
  "slug"                TEXT NOT NULL,
  "title"               TEXT NOT NULL,
  "shortDescription"    TEXT,
  "longDescription"     TEXT,
  "partnerOrganization" TEXT,
  "kind"                TEXT NOT NULL DEFAULT 'workshop',
  "startDateTime"       TIMESTAMP(3) NOT NULL,
  "endDateTime"         TIMESTAMP(3) NOT NULL,
  "locationName"        TEXT,
  "locationAddress"     TEXT,
  "requiresTransport"   BOOLEAN NOT NULL DEFAULT false,
  "departureLocation"   TEXT,
  "capacity"            INTEGER NOT NULL,
  "learnMoreUrl"        TEXT,
  "displayOrder"        INTEGER NOT NULL DEFAULT 0,
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workshop_eventId_slug_key" ON "Workshop"("eventId", "slug");
CREATE INDEX "Workshop_eventId_startDateTime_idx" ON "Workshop"("eventId", "startDateTime");
CREATE INDEX "Workshop_eventId_isActive_idx" ON "Workshop"("eventId", "isActive");


CREATE TABLE "WorkshopBooking" (
  "id"               TEXT NOT NULL,
  "workshopId"       TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'confirmed',
  "waitlistPosition" INTEGER,
  "bookedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt"      TIMESTAMP(3),
  CONSTRAINT "WorkshopBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkshopBooking_workshopId_userId_key"
  ON "WorkshopBooking"("workshopId", "userId");
CREATE INDEX "WorkshopBooking_userId_status_idx"
  ON "WorkshopBooking"("userId", "status");
CREATE INDEX "WorkshopBooking_workshopId_status_waitlistPosition_idx"
  ON "WorkshopBooking"("workshopId", "status", "waitlistPosition");


CREATE TABLE "SymposiumSession" (
  "id"              TEXT NOT NULL,
  "eventId"         TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "description"     TEXT,
  "startTime"       TIMESTAMP(3) NOT NULL,
  "endTime"         TIMESTAMP(3) NOT NULL,
  "room"            TEXT,
  "kind"            TEXT NOT NULL,
  "isSelectable"    BOOLEAN NOT NULL DEFAULT false,
  "breakoutGroupId" TEXT,
  "displayOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SymposiumSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SymposiumSession_eventId_startTime_idx"
  ON "SymposiumSession"("eventId", "startTime");
CREATE INDEX "SymposiumSession_eventId_breakoutGroupId_idx"
  ON "SymposiumSession"("eventId", "breakoutGroupId");


CREATE TABLE "Speaker" (
  "id"           TEXT NOT NULL,
  "eventId"      TEXT NOT NULL,
  "fullName"     TEXT NOT NULL,
  "title"        TEXT,
  "organization" TEXT,
  "bio"          TEXT,
  "photoUrl"     TEXT,
  "socialLinks"  JSONB,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Speaker_eventId_idx" ON "Speaker"("eventId");


CREATE TABLE "SymposiumSessionSpeaker" (
  "sessionId" TEXT NOT NULL,
  "speakerId" TEXT NOT NULL,
  "role"      TEXT NOT NULL DEFAULT 'speaker',
  "order"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SymposiumSessionSpeaker_pkey" PRIMARY KEY ("sessionId", "speakerId")
);


CREATE TABLE "Registration" (
  "id"                   TEXT NOT NULL,
  "eventId"              TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "attendeeType"         TEXT NOT NULL DEFAULT 'trainee',
  "registrationStatus"   TEXT NOT NULL DEFAULT 'pending',
  "includesSymposiumDay" BOOLEAN NOT NULL DEFAULT true,
  "paymentProvider"      TEXT NOT NULL DEFAULT 'none',
  "paymentStatus"        TEXT NOT NULL DEFAULT 'pending',
  "externalPaymentId"    TEXT,
  "amountCents"          INTEGER NOT NULL DEFAULT 0,
  "currency"             TEXT NOT NULL DEFAULT 'CAD',
  "qrToken"              TEXT NOT NULL,
  "checkedInAt"          TIMESTAMP(3),
  "dietaryRestrictions"  TEXT,
  "accessibilityNeeds"   TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Registration_qrToken_key" ON "Registration"("qrToken");
CREATE UNIQUE INDEX "Registration_eventId_userId_key"
  ON "Registration"("eventId", "userId");
CREATE INDEX "Registration_eventId_registrationStatus_idx"
  ON "Registration"("eventId", "registrationStatus");


CREATE TABLE "PersonalAgendaEntry" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "symposiumSessionId" TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonalAgendaEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalAgendaEntry_userId_symposiumSessionId_key"
  ON "PersonalAgendaEntry"("userId", "symposiumSessionId");
CREATE INDEX "PersonalAgendaEntry_userId_idx"
  ON "PersonalAgendaEntry"("userId");


CREATE TABLE "Sponsor" (
  "id"           TEXT NOT NULL,
  "eventId"      TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "tier"         TEXT NOT NULL DEFAULT 'partner',
  "logoUrl"      TEXT,
  "website"      TEXT,
  "description"  TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sponsor_eventId_idx" ON "Sponsor"("eventId");


CREATE TABLE "SymposiumQuestion" (
  "id"                 TEXT NOT NULL,
  "symposiumSessionId" TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "body"               TEXT NOT NULL,
  "upvoteCount"        INTEGER NOT NULL DEFAULT 0,
  "isAnswered"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SymposiumQuestion_pkey" PRIMARY KEY ("id")
);

-- Descending on upvoteCount so the "top of the room" sort uses the
-- index directly without a sort step.
CREATE INDEX "SymposiumQuestion_symposiumSessionId_upvoteCount_idx"
  ON "SymposiumQuestion"("symposiumSessionId", "upvoteCount" DESC);


CREATE TABLE "SymposiumQuestionVote" (
  "questionId" TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SymposiumQuestionVote_pkey" PRIMARY KEY ("questionId", "userId")
);


CREATE TABLE "Poll" (
  "id"                 TEXT NOT NULL,
  "symposiumSessionId" TEXT NOT NULL,
  "question"           TEXT NOT NULL,
  "options"            JSONB NOT NULL,
  "isOpen"             BOOLEAN NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"           TIMESTAMP(3),
  CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "PollResponse" (
  "id"        TEXT NOT NULL,
  "pollId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "optionId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PollResponse_pollId_userId_key"
  ON "PollResponse"("pollId", "userId");


-- ════════════════════════════════════════════════════════════════
-- Foreign keys
-- ════════════════════════════════════════════════════════════════

-- Workshop → BhnEvent
ALTER TABLE "Workshop"
  ADD CONSTRAINT "Workshop_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkshopBooking → Workshop / User
ALTER TABLE "WorkshopBooking"
  ADD CONSTRAINT "WorkshopBooking_workshopId_fkey"
  FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopBooking"
  ADD CONSTRAINT "WorkshopBooking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- SymposiumSession → BhnEvent
ALTER TABLE "SymposiumSession"
  ADD CONSTRAINT "SymposiumSession_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Speaker → BhnEvent
ALTER TABLE "Speaker"
  ADD CONSTRAINT "Speaker_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SymposiumSessionSpeaker → SymposiumSession / Speaker
ALTER TABLE "SymposiumSessionSpeaker"
  ADD CONSTRAINT "SymposiumSessionSpeaker_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "SymposiumSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SymposiumSessionSpeaker"
  ADD CONSTRAINT "SymposiumSessionSpeaker_speakerId_fkey"
  FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Registration → BhnEvent / User
ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PersonalAgendaEntry → User / SymposiumSession
ALTER TABLE "PersonalAgendaEntry"
  ADD CONSTRAINT "PersonalAgendaEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalAgendaEntry"
  ADD CONSTRAINT "PersonalAgendaEntry_symposiumSessionId_fkey"
  FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Sponsor → BhnEvent
ALTER TABLE "Sponsor"
  ADD CONSTRAINT "Sponsor_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SymposiumQuestion → SymposiumSession / User
ALTER TABLE "SymposiumQuestion"
  ADD CONSTRAINT "SymposiumQuestion_symposiumSessionId_fkey"
  FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SymposiumQuestion"
  ADD CONSTRAINT "SymposiumQuestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SymposiumQuestionVote → SymposiumQuestion / User
ALTER TABLE "SymposiumQuestionVote"
  ADD CONSTRAINT "SymposiumQuestionVote_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "SymposiumQuestion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SymposiumQuestionVote"
  ADD CONSTRAINT "SymposiumQuestionVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Poll → SymposiumSession
ALTER TABLE "Poll"
  ADD CONSTRAINT "Poll_symposiumSessionId_fkey"
  FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PollResponse → Poll / User
ALTER TABLE "PollResponse"
  ADD CONSTRAINT "PollResponse_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollResponse"
  ADD CONSTRAINT "PollResponse_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
