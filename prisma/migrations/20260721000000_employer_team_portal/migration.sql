-- Employer team portal — foundation migration.
--
-- Promotes the employer surface from single-seat (company data on
-- the User row, postings filtered by createdById) to a shared
-- company workspace (Company entity, CompanyMember junction, per-
-- posting hiring teams, activity log, notifications, scorecards,
-- email templates, presence pings).
--
-- All new columns on existing tables are nullable so the migration
-- is reversible. The backfill script (scripts/backfillEmployerCompanies.ts)
-- populates them for every existing employer User. A later migration
-- can tighten the NOT NULL constraints once backfill is verified.
--
-- See docs/plans/employer-team-portal.md for the full architecture.

-- ── 1. Company ───────────────────────────────────────────────────
CREATE TABLE "Company" (
  "id"            TEXT          NOT NULL,
  "name"          TEXT          NOT NULL,
  "domain"        TEXT,
  "website"       TEXT,
  "logo"          TEXT,
  "logoShape"     TEXT,
  "logoTransform" JSONB,
  "brand"         JSONB,
  "industry"      TEXT,
  "size"          TEXT,
  "location"      TEXT,
  "description"   TEXT,
  "founded"       TEXT,
  "mainBusiness"  TEXT,
  "ticker"        TEXT,
  "kind"          TEXT          NOT NULL DEFAULT 'real',
  "demoExpiresAt" TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Company_domain_idx"              ON "Company" ("domain");
CREATE INDEX "Company_kind_demoExpiresAt_idx"  ON "Company" ("kind", "demoExpiresAt");

-- ── 2. CompanyMember ─────────────────────────────────────────────
CREATE TABLE "CompanyMember" (
  "id"          TEXT          NOT NULL,
  "companyId"   TEXT          NOT NULL,
  "userId"      TEXT          NOT NULL,
  "role"        TEXT          NOT NULL,
  "title"       TEXT,
  "invitedById" TEXT,
  "joinedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3),
  CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember" ("companyId", "userId");
CREATE INDEX "CompanyMember_userId_idx"           ON "CompanyMember" ("userId");
CREATE INDEX "CompanyMember_companyId_role_idx"   ON "CompanyMember" ("companyId", "role");

ALTER TABLE "CompanyMember"
  ADD CONSTRAINT "CompanyMember_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyMember"
  ADD CONSTRAINT "CompanyMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyMember"
  ADD CONSTRAINT "CompanyMember_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. CompanyInvite ─────────────────────────────────────────────
CREATE TABLE "CompanyInvite" (
  "id"           TEXT          NOT NULL,
  "companyId"    TEXT          NOT NULL,
  "email"        TEXT          NOT NULL,
  "role"         TEXT          NOT NULL,
  "title"        TEXT,
  "token"        TEXT          NOT NULL,
  "invitedById"  TEXT          NOT NULL,
  "note"         TEXT,
  "status"       TEXT          NOT NULL DEFAULT 'pending',
  "expiresAt"    TIMESTAMP(3)  NOT NULL,
  "acceptedAt"   TIMESTAMP(3),
  "acceptedById" TEXT,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyInvite_token_key"            ON "CompanyInvite" ("token");
CREATE INDEX "CompanyInvite_companyId_status_idx"        ON "CompanyInvite" ("companyId", "status");
CREATE INDEX "CompanyInvite_email_status_idx"            ON "CompanyInvite" ("email", "status");

ALTER TABLE "CompanyInvite"
  ADD CONSTRAINT "CompanyInvite_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyInvite"
  ADD CONSTRAINT "CompanyInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyInvite"
  ADD CONSTRAINT "CompanyInvite_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. CompanyJoinRequest ────────────────────────────────────────
CREATE TABLE "CompanyJoinRequest" (
  "id"            TEXT          NOT NULL,
  "companyId"     TEXT          NOT NULL,
  "requesterId"   TEXT          NOT NULL,
  "suggestedRole" TEXT          NOT NULL,
  "note"          TEXT,
  "status"        TEXT          NOT NULL DEFAULT 'pending',
  "decidedById"   TEXT,
  "decidedAt"     TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyJoinRequest_companyId_requesterId_status_key"
  ON "CompanyJoinRequest" ("companyId", "requesterId", "status");
CREATE INDEX "CompanyJoinRequest_companyId_status_idx"
  ON "CompanyJoinRequest" ("companyId", "status");

ALTER TABLE "CompanyJoinRequest"
  ADD CONSTRAINT "CompanyJoinRequest_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyJoinRequest"
  ADD CONSTRAINT "CompanyJoinRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyJoinRequest"
  ADD CONSTRAINT "CompanyJoinRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 5. EmployerActivityLog ───────────────────────────────────────
CREATE TABLE "EmployerActivityLog" (
  "id"           TEXT          NOT NULL,
  "companyId"    TEXT          NOT NULL,
  "actorId"      TEXT          NOT NULL,
  "kind"         TEXT          NOT NULL,
  "payload"      JSONB         NOT NULL,
  "postingId"    TEXT,
  "applicantId"  TEXT,
  "targetUserId" TEXT,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployerActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployerActivityLog_companyId_createdAt_idx"
  ON "EmployerActivityLog" ("companyId", "createdAt");
CREATE INDEX "EmployerActivityLog_companyId_kind_createdAt_idx"
  ON "EmployerActivityLog" ("companyId", "kind", "createdAt");
CREATE INDEX "EmployerActivityLog_postingId_createdAt_idx"
  ON "EmployerActivityLog" ("postingId", "createdAt");
CREATE INDEX "EmployerActivityLog_applicantId_createdAt_idx"
  ON "EmployerActivityLog" ("applicantId", "createdAt");

ALTER TABLE "EmployerActivityLog"
  ADD CONSTRAINT "EmployerActivityLog_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployerActivityLog"
  ADD CONSTRAINT "EmployerActivityLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployerActivityLog"
  ADD CONSTRAINT "EmployerActivityLog_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployerActivityLog"
  ADD CONSTRAINT "EmployerActivityLog_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployerActivityLog"
  ADD CONSTRAINT "EmployerActivityLog_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 6. ApplicantTeamComment ──────────────────────────────────────
CREATE TABLE "ApplicantTeamComment" (
  "id"                  TEXT          NOT NULL,
  "applicationStatusId" TEXT          NOT NULL,
  "authorId"            TEXT          NOT NULL,
  "authorRoleAtWrite"   TEXT          NOT NULL,
  "body"                TEXT          NOT NULL,
  "mentions"            TEXT[]        NOT NULL DEFAULT '{}',
  "parentId"            TEXT,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "ApplicantTeamComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicantTeamComment_applicationStatusId_createdAt_idx"
  ON "ApplicantTeamComment" ("applicationStatusId", "createdAt");

ALTER TABLE "ApplicantTeamComment"
  ADD CONSTRAINT "ApplicantTeamComment_applicationStatusId_fkey"
  FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicantTeamComment"
  ADD CONSTRAINT "ApplicantTeamComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicantTeamComment"
  ADD CONSTRAINT "ApplicantTeamComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ApplicantTeamComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 7. PostingTeamMember ─────────────────────────────────────────
CREATE TABLE "PostingTeamMember" (
  "id"        TEXT          NOT NULL,
  "postingId" TEXT          NOT NULL,
  "userId"    TEXT          NOT NULL,
  "role"      TEXT          NOT NULL,
  "addedById" TEXT,
  "addedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostingTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostingTeamMember_postingId_userId_key"
  ON "PostingTeamMember" ("postingId", "userId");
CREATE INDEX "PostingTeamMember_userId_idx"         ON "PostingTeamMember" ("userId");
CREATE INDEX "PostingTeamMember_postingId_role_idx" ON "PostingTeamMember" ("postingId", "role");

ALTER TABLE "PostingTeamMember"
  ADD CONSTRAINT "PostingTeamMember_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostingTeamMember"
  ADD CONSTRAINT "PostingTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostingTeamMember"
  ADD CONSTRAINT "PostingTeamMember_addedById_fkey"
  FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 8. EmailTemplate ─────────────────────────────────────────────
CREATE TABLE "EmailTemplate" (
  "id"             TEXT          NOT NULL,
  "companyId"      TEXT          NOT NULL,
  "name"           TEXT          NOT NULL,
  "kind"           TEXT          NOT NULL,
  "subject"        TEXT          NOT NULL,
  "body"           TEXT          NOT NULL,
  "isStarter"      BOOLEAN       NOT NULL DEFAULT false,
  "starterVersion" INTEGER,
  "createdById"    TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailTemplate_companyId_kind_idx" ON "EmailTemplate" ("companyId", "kind");

ALTER TABLE "EmailTemplate"
  ADD CONSTRAINT "EmailTemplate_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailTemplate"
  ADD CONSTRAINT "EmailTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 9. InterviewScorecard ────────────────────────────────────────
CREATE TABLE "InterviewScorecard" (
  "id"        TEXT          NOT NULL,
  "postingId" TEXT          NOT NULL,
  "criteria"  JSONB         NOT NULL,
  "locked"    BOOLEAN       NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewScorecard_postingId_key" ON "InterviewScorecard" ("postingId");

ALTER TABLE "InterviewScorecard"
  ADD CONSTRAINT "InterviewScorecard_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 10. ScorecardSubmission ──────────────────────────────────────
CREATE TABLE "ScorecardSubmission" (
  "id"                  TEXT          NOT NULL,
  "scorecardId"         TEXT          NOT NULL,
  "applicationStatusId" TEXT          NOT NULL,
  "interviewerId"       TEXT          NOT NULL,
  "scores"              JSONB         NOT NULL,
  "recommendation"      TEXT,
  "summary"             TEXT,
  "status"              TEXT          NOT NULL DEFAULT 'draft',
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,
  "submittedAt"         TIMESTAMP(3),
  CONSTRAINT "ScorecardSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScorecardSubmission_scorecardId_applicationStatusId_interviewerId_key"
  ON "ScorecardSubmission" ("scorecardId", "applicationStatusId", "interviewerId");
CREATE INDEX "ScorecardSubmission_applicationStatusId_status_idx"
  ON "ScorecardSubmission" ("applicationStatusId", "status");

ALTER TABLE "ScorecardSubmission"
  ADD CONSTRAINT "ScorecardSubmission_scorecardId_fkey"
  FOREIGN KEY ("scorecardId") REFERENCES "InterviewScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScorecardSubmission"
  ADD CONSTRAINT "ScorecardSubmission_applicationStatusId_fkey"
  FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScorecardSubmission"
  ADD CONSTRAINT "ScorecardSubmission_interviewerId_fkey"
  FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 11. Notification ─────────────────────────────────────────────
CREATE TABLE "Notification" (
  "id"            TEXT          NOT NULL,
  "userId"        TEXT          NOT NULL,
  "companyId"     TEXT          NOT NULL,
  "activityLogId" TEXT          NOT NULL,
  "reason"        TEXT          NOT NULL,
  "readAt"        TIMESTAMP(3),
  "digestSentAt"  TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx"
  ON "Notification" ("userId", "readAt", "createdAt");
CREATE INDEX "Notification_userId_digestSentAt_idx"
  ON "Notification" ("userId", "digestSentAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_activityLogId_fkey"
  FOREIGN KEY ("activityLogId") REFERENCES "EmployerActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 12. NotificationPreference ───────────────────────────────────
CREATE TABLE "NotificationPreference" (
  "id"               TEXT     NOT NULL,
  "userId"           TEXT     NOT NULL,
  "companyId"        TEXT     NOT NULL,
  "inAppOn"          BOOLEAN  NOT NULL DEFAULT true,
  "emailImmediateOn" BOOLEAN  NOT NULL DEFAULT false,
  "emailDigestOn"    BOOLEAN  NOT NULL DEFAULT true,
  "digestCadence"    TEXT     NOT NULL DEFAULT 'daily',
  "mutedReasons"     TEXT[]   NOT NULL DEFAULT '{}',
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_companyId_key"
  ON "NotificationPreference" ("userId", "companyId");

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 13. EmployerPresencePing ─────────────────────────────────────
CREATE TABLE "EmployerPresencePing" (
  "id"                  TEXT          NOT NULL,
  "companyId"           TEXT          NOT NULL,
  "userId"              TEXT          NOT NULL,
  "applicationStatusId" TEXT          NOT NULL,
  "expiresAt"           TIMESTAMP(3)  NOT NULL,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployerPresencePing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployerPresencePing_userId_applicationStatusId_key"
  ON "EmployerPresencePing" ("userId", "applicationStatusId");
CREATE INDEX "EmployerPresencePing_applicationStatusId_expiresAt_idx"
  ON "EmployerPresencePing" ("applicationStatusId", "expiresAt");
CREATE INDEX "EmployerPresencePing_expiresAt_idx"
  ON "EmployerPresencePing" ("expiresAt");

ALTER TABLE "EmployerPresencePing"
  ADD CONSTRAINT "EmployerPresencePing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 14. New columns on InternshipPosting ────────────────────────
ALTER TABLE "InternshipPosting"
  ADD COLUMN "companyId"       TEXT,
  ADD COLUMN "lastTouchedAt"   TIMESTAMP(3),
  ADD COLUMN "lastTouchedById" TEXT;

CREATE INDEX "InternshipPosting_companyId_status_createdAt_idx"
  ON "InternshipPosting" ("companyId", "status", "createdAt");

ALTER TABLE "InternshipPosting"
  ADD CONSTRAINT "InternshipPosting_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternshipPosting"
  ADD CONSTRAINT "InternshipPosting_lastTouchedById_fkey"
  FOREIGN KEY ("lastTouchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 15. New columns on ApplicationStatus ────────────────────────
ALTER TABLE "ApplicationStatus"
  ADD COLUMN "lastTouchedAt"   TIMESTAMP(3),
  ADD COLUMN "lastTouchedById" TEXT;

ALTER TABLE "ApplicationStatus"
  ADD CONSTRAINT "ApplicationStatus_lastTouchedById_fkey"
  FOREIGN KEY ("lastTouchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
