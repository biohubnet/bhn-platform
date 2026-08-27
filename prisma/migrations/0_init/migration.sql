-- Baseline migration (2026-08-27).
--
-- Collapses the 135 incremental migrations that preceded it into the
-- schema they were meant to produce. Those could not replay from an
-- empty database: three migrations dated 2026-05-13 used a column that
-- 20260516000000_sandbox_and_demo_accounts created three days later, so
-- a fresh environment died at migration 29 of 135.
--
-- The 135 originals are preserved in git history at 95d860f3. They are
-- not deleted knowledge, just no longer replayed.
--
-- Production was reconciled with `prisma migrate resolve --applied 0_init`
-- BEFORE this landed. That order is not optional: `npm run build` runs
-- `prisma migrate deploy` on every Vercel deploy, and deploying this file
-- against the populated database without resolving first fails with
-- `relation "User" already exists` and leaves a failed-migration row that
-- blocks every later migration. Rehearsed both orders against a local
-- Postgres 16 built to match production before touching anything.
--
-- prisma migrate diff does NOT emit the pgvector extension even though
-- three tables use vector(384), so it is declared here explicitly.
-- Without it this file fails on a clean database at the first embedding
-- column.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'trainee',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "allowPlatformContent" BOOLEAN NOT NULL DEFAULT false,
    "employerCompany" TEXT,
    "companyWebsite" TEXT,
    "companyLogo" TEXT,
    "companyLogoShape" TEXT,
    "companyLogoTransform" JSONB,
    "companyBrand" JSONB,
    "companyIndustry" TEXT,
    "companySize" TEXT,
    "companyLocation" TEXT,
    "companyDescription" TEXT,
    "companyFounded" TEXT,
    "companyMainBusiness" TEXT,
    "companyTicker" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "newsletterSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "newsletterSubscribedAt" TIMESTAMP(3),
    "newsletterStatus" TEXT NOT NULL DEFAULT 'no',
    "newsletterExportedAt" TIMESTAMP(3),
    "mailchimpMemberId" TEXT,
    "mailchimpStatus" TEXT,
    "mailchimpSyncedAt" TIMESTAMP(3),
    "accountKind" TEXT NOT NULL DEFAULT 'real',
    "demoExpiresAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "magicToken" TEXT,
    "emailVerifyToken" TEXT,
    "emailVerifyExpires" TIMESTAMP(3),
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastFailedLoginAt" TIMESTAMP(3),
    "passwordUpdatedAt" TIMESTAMP(3),
    "preferredName" TEXT,
    "resumeUrl" TEXT,
    "videoIntroUrl" TEXT,
    "elevatorPitch" TEXT,
    "applicationUpdatedAt" TIMESTAMP(3),
    "onboarding" JSONB,
    "hasSplitCell" BOOLEAN NOT NULL DEFAULT false,
    "consent" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "phone" TEXT,
    "bio" TEXT,
    "organization" TEXT,
    "jobTitle" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featurePrefs" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "EmployerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "companyName" TEXT,
    "companyWebsite" TEXT,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),

    CONSTRAINT "EmployerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "website" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'for-employers',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "handledAt" TIMESTAMP(3),
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "embedding" vector(384),
    "status" TEXT NOT NULL DEFAULT 'active',
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAlias" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSkill" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL DEFAULT 'inferred',
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingSkill" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostingSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatus" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "rating" INTEGER,
    "coverLetter" TEXT,
    "rejectionReason" TEXT,
    "employerNote" TEXT,
    "source" TEXT,
    "sourceDetail" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTouchedAt" TIMESTAMP(3),
    "lastTouchedById" TEXT,

    CONSTRAINT "ApplicationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "scheduledById" TEXT NOT NULL,
    "proposedSlots" JSONB NOT NULL,
    "acceptedSlot" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "format" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "logoShape" TEXT,
    "logoTransform" JSONB,
    "brand" JSONB,
    "industry" TEXT,
    "size" TEXT,
    "location" TEXT,
    "description" TEXT,
    "founded" TEXT,
    "mainBusiness" TEXT,
    "ticker" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'real',
    "demoExpiresAt" TIMESTAMP(3),
    "deiReportingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyJoinRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "suggestedRole" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerActivityLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "postingId" TEXT,
    "applicantId" TEXT,
    "targetUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantTeamComment" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRoleAtWrite" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" TEXT[],
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantTeamComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingTeamMember" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "addedById" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostingTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "starterVersion" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewScorecard" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardSubmission" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "recommendation" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "ScorecardSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activityLogId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "digestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inAppOn" BOOLEAN NOT NULL DEFAULT true,
    "emailImmediateOn" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestOn" BOOLEAN NOT NULL DEFAULT true,
    "digestCadence" TEXT NOT NULL DEFAULT 'daily',
    "mutedReasons" TEXT[],

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerPresencePing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerPresencePing_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "InternshipPosting" (
    "id" TEXT NOT NULL,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "hours" TEXT,
    "location" TEXT,
    "type" TEXT,
    "compensation" TEXT,
    "deadline" TIMESTAMP(3),
    "keySkills" TEXT[],
    "positionDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contactEmail" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "lastTouchedAt" TIMESTAMP(3),
    "lastTouchedById" TEXT,

    CONSTRAINT "InternshipPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "eligibilityApprovedAt" TIMESTAMP(3),
    "eligibilityApprovedBy" TEXT,
    "eligibilityNote" TEXT,
    "leftPoolAt" TIMESTAMP(3),
    "leftPoolReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationComment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolExitFeedback" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "helpfulness" INTEGER,
    "partnerQuality" INTEGER,
    "platformExperience" INTEGER,
    "communicationFreq" INTEGER,
    "npsScore" INTEGER,
    "foundJob" BOOLEAN NOT NULL DEFAULT false,
    "jobSource" TEXT,
    "whatWorkedWell" TEXT,
    "whatToImprove" TEXT,
    "additionalComments" TEXT,
    "allowFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolExitFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackInvitation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "invitedById" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'exit_survey',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "feedbackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enrollByDate" TIMESTAMP(3),
    "cohortStartDate" TIMESTAMP(3),
    "cohortEndDate" TIMESTAMP(3),
    "sessionDates" TEXT,
    "thumbnail" TEXT,
    "thumbnailOverlay" JSONB,
    "category" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "courseType" TEXT NOT NULL DEFAULT 'scorm',
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "maxAttempts" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "creditCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topic" TEXT,
    "delivery" TEXT,
    "provider" TEXT,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "instructorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiSummary" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "embedding" vector(384),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScormPackage" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "entryPoint" TEXT NOT NULL,
    "manifestData" TEXT NOT NULL,
    "uploadPath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScormPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScormSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'not attempted',
    "score" DOUBLE PRECISION,
    "scoreMin" DOUBLE PRECISION,
    "scoreMax" DOUBLE PRECISION,
    "timeSpent" TEXT,
    "location" TEXT,
    "suspendData" TEXT,
    "interactions" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScormSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'content',
    "content" TEXT,
    "videoUrl" TEXT,
    "fileUrl" TEXT,
    "duration" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" DOUBLE PRECISION,
    "timeSpent" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "score" DOUBLE PRECISION,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeLimit" INTEGER,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "maxAttempts" INTEGER NOT NULL DEFAULT 0,
    "shuffleQ" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "explanation" TEXT,
    "topic" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "lastQuality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleCheckpoint" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "timestampSeconds" DOUBLE PRECISION NOT NULL,
    "questionId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "answers" TEXT NOT NULL,
    "timeSpent" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XapiStatement" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verb" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "result" TEXT,
    "context" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stored" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authority" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.3',

    CONSTRAINT "XapiStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authEndpoint" TEXT NOT NULL,
    "tokenEndpoint" TEXT NOT NULL,
    "jwksEndpoint" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LtiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "pathwayId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'course',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "metadata" TEXT,
    "pdfUrl" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationProgram" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "discipline" TEXT,
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationLevel" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "courseIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "credentialNumber" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CertificationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pathway" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "thumbnailOverlay" JSONB,
    "category" TEXT,
    "accentColor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "creditCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'open',
    "enrollmentOpensAt" TIMESTAMP(3),
    "enrollmentClosesAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCohort" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "waitlistCapacity" INTEGER,
    "enrollmentOpensAt" TIMESTAMP(3),
    "enrollmentClosesAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayCourse" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PathwayCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "cohortId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "waitlistPosition" INTEGER,
    "requestReason" TEXT,
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "sessionsAttended" INTEGER NOT NULL DEFAULT 0,
    "attendanceNote" TEXT,
    "attendanceRecordedAt" TIMESTAMP(3),
    "attendanceRecordedById" TEXT,

    CONSTRAINT "PathwayEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAmount" DOUBLE PRECISION NOT NULL DEFAULT 4800,
    "approvedAmount" DOUBLE PRECISION,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "title" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "useCase" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "courseId" TEXT,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "expiredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notified90At" TIMESTAMP(3),
    "notified30At" TIMESTAMP(3),
    "notified7At" TIMESTAMP(3),

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCourse" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "courseId" TEXT,
    "authorId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicSignature" (
    "id" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'session',
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ElectronicSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "promptVersion" TEXT,
    "validationPassed" BOOLEAN,
    "userRating" INTEGER,
    "confidence" DOUBLE PRECISION,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "answerExcerpt" TEXT,
    "agentTriagedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL,
    "commitSha" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'local',
    "scores" JSONB NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL DEFAULT 'triage',
    "trigger" TEXT NOT NULL DEFAULT 'schedule',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsProposed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "detail" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditableCopy" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "EditableCopy_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BuddyPair" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "focusType" TEXT,
    "focusId" TEXT,
    "goalNote" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,

    CONSTRAINT "BuddyPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyMessage" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "BuddyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "referrer" TEXT,
    "props" JSONB,
    "role" TEXT,
    "device" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'UNCLAIMED',
    "fulfillmentMethod" TEXT NOT NULL DEFAULT 'PICKUP',
    "claimedAt" TIMESTAMP(3),
    "recipientName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "shirtSize" TEXT,
    "notes" TEXT,
    "shippedAt" TIMESTAMP(3),
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "fulfilledById" TEXT,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'feature',
    "version" TEXT,
    "buildSha" TEXT,
    "visibleTo" TEXT[] DEFAULT ARRAY['trainee', 'evaluating', 'instructor', 'admin', 'superadmin']::TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchChecklistState" (
    "id" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "manualStatus" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "targetDate" TIMESTAMP(3),
    "decisionNeeded" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchChecklistState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BhnEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "mainVenueName" TEXT,
    "mainVenueAddress" TEXT,
    "mainVenueMapUrl" TEXT,
    "coverImageUrl" TEXT,
    "brandingJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "accommodationInfo" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxAttendees" INTEGER,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BhnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'host',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRegQuestion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hint" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRegQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRegAnswer" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "customRegQuestionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CustomRegAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventBroadcast" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceFilter" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "partnerOrganization" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'workshop',
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "requiresTransport" BOOLEAN NOT NULL DEFAULT false,
    "departureLocation" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "waitlistCapacity" INTEGER NOT NULL DEFAULT 5,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "learnMoreUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopBooking" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "waitlistPosition" INTEGER,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,

    CONSTRAINT "WorkshopBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymposiumSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "room" TEXT,
    "kind" TEXT NOT NULL,
    "isSelectable" BOOLEAN NOT NULL DEFAULT false,
    "breakoutGroupId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymposiumSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "organization" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "socialLinks" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymposiumSessionSpeaker" (
    "sessionId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'speaker',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SymposiumSessionSpeaker_pkey" PRIMARY KEY ("sessionId","speakerId")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "guestOrganization" TEXT,
    "guestPhone" TEXT,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "attendeeType" TEXT NOT NULL DEFAULT 'trainee',
    "registrationStatus" TEXT NOT NULL DEFAULT 'pending',
    "waitlistPosition" INTEGER,
    "includesSymposiumDay" BOOLEAN NOT NULL DEFAULT true,
    "paymentProvider" TEXT NOT NULL DEFAULT 'none',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "externalPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "qrToken" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "dietaryRestrictions" TEXT,
    "accessibilityNeeds" TEXT,
    "adminNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalAgendaEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symposiumSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalAgendaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'partner',
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymposiumQuestion" (
    "id" TEXT NOT NULL,
    "symposiumSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymposiumQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymposiumQuestionVote" (
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymposiumQuestionVote_pkey" PRIMARY KEY ("questionId","userId")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "symposiumSessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollResponse" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeProposal" (
    "id" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inspiration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "shippedThemeId" TEXT,
    "bountyIssued" BOOLEAN NOT NULL DEFAULT false,
    "bountyRewardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchInsight" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "signalsLinked" JSONB,
    "publishedToChangelogAt" TIMESTAMP(3),
    "publishedChangelogId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "state" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiHistory" JSONB,
    "sourcePostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarStorySkill" (
    "storyId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "StarStorySkill_pkey" PRIMARY KEY ("storyId","skillId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "templateKey" TEXT,
    "body" TEXT NOT NULL,
    "compensation" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "hoursPerWeek" TEXT,
    "location" TEXT,
    "acceptDeadline" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "signatureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewScore" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "scorerUserId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "skillScores" JSONB,
    "recommendation" TEXT NOT NULL,
    "strengths" TEXT,
    "concerns" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "surface" TEXT,
    "target" TEXT,
    "payload" JSONB,

    CONSTRAINT "AssistEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistDailyRollup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "rageClicks" INTEGER NOT NULL DEFAULT 0,
    "deadClicks" INTEGER NOT NULL DEFAULT 0,
    "formAbandons" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssistDailyRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistWeeklySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "stuckOn" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistWeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistHint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "surface" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shownAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistHint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistHintFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rating" INTEGER,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistHintFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistPreferences" (
    "userId" TEXT NOT NULL,
    "consented" BOOLEAN NOT NULL DEFAULT true,
    "consentedAt" TIMESTAMP(3),
    "hintsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "suppressUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "EquipApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "applicationStage" TEXT NOT NULL DEFAULT 'pre_screen',
    "requestedAmount" DOUBLE PRECISION,
    "approvedAmount" DOUBLE PRECISION,
    "applicantType" TEXT,
    "institution" TEXT,
    "institutionOther" TEXT,
    "commercializationStage" TEXT,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "preScreenDecidedAt" TIMESTAMP(3),
    "preScreenReviewerNote" TEXT,
    "fullAppSubmittedAt" TIMESTAMP(3),
    "reviewerScores" JSONB,
    "decidedAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "disbursementNote" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipApplicationMessage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipApplicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "committee" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipDeadline" (
    "id" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "originalDeadlineAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "cycleLabel" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "extendedAt" TIMESTAMP(3),
    "extendedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityDeadline" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blurb" TEXT,
    "opensAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "ctaUrl" TEXT,
    "ctaLabel" TEXT,
    "pillText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpApplicationWindow" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpApplicationWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpMemberApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "reviewerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpMemberApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpFeedbackRound" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpFeedbackRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpFeedbackResponse" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpFeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "agenda" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "meetingUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpMeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpMeetingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpActionItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "dueOn" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqpCoiDisclosure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqpCoiDisclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience" TEXT NOT NULL DEFAULT 'public',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "jdSnippet" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT,
    "location" TEXT,
    "payload" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "generationMs" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "jdBody" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "simulationId" TEXT,
    "adminNotes" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAttempt" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 1,
    "scenarioIndex" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL,
    "log" JSONB NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "finalScore" INTEGER,
    "finalTier" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationShareToken" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationComment" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "ip" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main resume',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "derivedFromId" TEXT,
    "derivedForPostingId" TEXT,
    "sourceFileUrl" TEXT,
    "parsedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeComment" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "anchorBulletId" TEXT,
    "anchorItemId" TEXT,
    "anchorSectionId" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeRevision" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "header" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterBullet" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "sectionKind" TEXT NOT NULL,
    "anchorTitle" TEXT,
    "anchorSubtitle" TEXT,
    "anchorDateRange" TEXT,
    "anchorCompany" TEXT,
    "anchorLocation" TEXT,
    "anchorStart" TEXT,
    "anchorEnd" TEXT,
    "anchorCurrent" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "metric" TEXT,
    "mechanism" TEXT,
    "canonicalPhrasing" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceNote" TEXT,
    "tags" TEXT[],
    "sourceResumeId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(384),
    "embeddingText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterBullet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterBulletRevision" (
    "id" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterBulletRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterSnapshot" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailoringJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT,
    "ats" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "comp" TEXT,
    "mustHaves" TEXT[],
    "niceToHaves" TEXT[],
    "responsibilities" TEXT[],
    "rawJD" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailoringJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailoringRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeId" TEXT,
    "resumeDoc" TEXT,
    "coverDoc" TEXT,
    "format" TEXT,
    "fitCheck" JSONB,
    "qaReport" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TailoringRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailoringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "trigger" TEXT NOT NULL DEFAULT '*',
    "ruleText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "codifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TailoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailoringCorrection" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "before" TEXT NOT NULL DEFAULT '',
    "after" TEXT NOT NULL DEFAULT '',
    "ruleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TailoringCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jdSnippet" TEXT NOT NULL DEFAULT '',
    "postingId" TEXT,
    "resumeId" TEXT,
    "coverLetter" TEXT NOT NULL DEFAULT '',
    "interviewPrep" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "applicationUrl" TEXT,
    "appliedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "recruiterName" TEXT,
    "recruiterEmail" TEXT,
    "referredBy" TEXT,
    "simulationRequestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'drafting',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFolderShareToken" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFolderShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFolderEvent" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFolderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "specialization" TEXT,
    "scale" TEXT,
    "notes" TEXT,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "lastScannedAt" TIMESTAMP(3),
    "scanError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseSubmission" (
    "id" TEXT NOT NULL,
    "programSlug" TEXT NOT NULL DEFAULT 'regulatory-affairs',
    "name" TEXT NOT NULL,
    "linkedinHandle" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "photoUrl" TEXT NOT NULL,
    "photoKey" TEXT NOT NULL,
    "submittedFromIp" TEXT,
    "submittedFromUa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDownloadedAt" TIMESTAMP(3),
    "lastDownloadedBy" TEXT,
    "adminNote" TEXT,
    "pills" JSONB NOT NULL DEFAULT '[]',
    "userId" TEXT,

    CONSTRAINT "ShowcaseSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eyebrow" TEXT,
    "intro" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pathwayId" TEXT,
    "cohortNumber" INTEGER,
    "linkedCohortId" TEXT,
    "gateOnAttendance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShowcaseGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseMembership" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcasePathway" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eyebrow" TEXT,
    "intro" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedPathwayId" TEXT,

    CONSTRAINT "ShowcasePathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringTarget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingId" TEXT,
    "metricKey" TEXT NOT NULL,
    "targetValue" DECIMAL(12,2) NOT NULL,
    "comparator" TEXT NOT NULL DEFAULT 'gte',
    "atRiskBand" DECIMAL(4,3),
    "period" TEXT NOT NULL DEFAULT 'quarter',
    "ownerId" TEXT,
    "note" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingCost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingId" TEXT,
    "costType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitingCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDemographics" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,
    "raceEthnicity" TEXT,
    "disabilityStatus" TEXT,
    "veteranStatus" TEXT,
    "indigenousStatus" TEXT,
    "consentedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDemographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationStatusId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "actorId" TEXT,
    "isDemoSeed" BOOLEAN NOT NULL DEFAULT false,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedFile" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'file-sharing',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'marketing',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'sections',
    "richContent" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptSection" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "heading" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptRevision" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Someone',
    "authorKind" TEXT NOT NULL DEFAULT 'anon',
    "snapshot" JSONB NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptComment" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "anchorSectionId" TEXT,
    "anchorFrom" INTEGER,
    "anchorTo" INTEGER,
    "parentId" TEXT,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Someone',
    "authorKind" TEXT NOT NULL DEFAULT 'anon',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "anchorQuote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptCollaborator" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "convertedUserId" TEXT,
    "offerDismissedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptShareToken" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptPresence" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "editorKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Someone',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "activeSid" TEXT,
    "recentSids" TEXT NOT NULL DEFAULT '',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "columns" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachContact" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedById" TEXT,
    "addedByName" TEXT NOT NULL DEFAULT 'BHN team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachPerson" (
    "id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "addedById" TEXT,
    "addedByName" TEXT NOT NULL DEFAULT 'BHN team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "introSentAt" TIMESTAMP(3),

    CONSTRAINT "OutreachPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachMembership" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedById" TEXT,
    "addedByName" TEXT NOT NULL DEFAULT 'BHN team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachShareToken" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCollaborator" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachTouch" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "listId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'email',
    "note" TEXT NOT NULL DEFAULT '',
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byId" TEXT,
    "byName" TEXT NOT NULL DEFAULT 'BHN team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "listId" TEXT,
    "templateId" TEXT NOT NULL,
    "returningTemplateId" TEXT,
    "vars" JSONB NOT NULL,
    "sentPersonIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL DEFAULT 'BHN team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInterview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overallScore" INTEGER,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInterviewAnswer" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "questionKind" TEXT NOT NULL DEFAULT 'behavioral',
    "transcript" TEXT NOT NULL DEFAULT '',
    "inputMode" TEXT NOT NULL DEFAULT 'text',
    "score" INTEGER,
    "feedback" TEXT NOT NULL DEFAULT '',
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "confidence" INTEGER,
    "wpm" INTEGER,
    "fillerCount" INTEGER,
    "deliveryNote" TEXT NOT NULL DEFAULT '',
    "guidance" JSONB,
    "voice" JSONB,
    "stumbleCount" INTEGER,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipReportShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipReportShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateline" TEXT NOT NULL,
    "preheader" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "renderedHtml" TEXT,
    "renderedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterPiece" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "rawBody" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageReview" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "round" INTEGER NOT NULL DEFAULT 1,
    "snapshotHtml" TEXT,
    "snapshotAt" TIMESTAMP(3),
    "shareToken" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageComment" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "parentId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "anchorQuote" TEXT,
    "anchorKey" TEXT,
    "anchorPath" TEXT,
    "anchorBlock" TEXT,
    "anchorState" TEXT NOT NULL DEFAULT 'found',
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Someone',
    "authorKind" TEXT NOT NULL DEFAULT 'user',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "advisorName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorBooking" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "topic" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_magicToken_key" ON "User"("magicToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE INDEX "User_newsletterStatus_newsletterExportedAt_idx" ON "User"("newsletterStatus", "newsletterExportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "LoginCode_email_expiresAt_idx" ON "LoginCode"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventForm_slug_key" ON "EventForm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerInvite_token_key" ON "EmployerInvite"("token");

-- CreateIndex
CREATE INDEX "EmployerInvite_email_idx" ON "EmployerInvite"("email");

-- CreateIndex
CREATE INDEX "EmployerInvite_invitedById_createdAt_idx" ON "EmployerInvite"("invitedById", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_kind_idx" ON "AccessRequest"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_status_idx" ON "Skill"("status");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAlias_alias_key" ON "SkillAlias"("alias");

-- CreateIndex
CREATE INDEX "SkillAlias_skillId_idx" ON "SkillAlias"("skillId");

-- CreateIndex
CREATE INDEX "CourseSkill_skillId_idx" ON "CourseSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSkill_courseId_skillId_key" ON "CourseSkill"("courseId", "skillId");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE INDEX "PostingSkill_skillId_idx" ON "PostingSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "PostingSkill_postingId_skillId_key" ON "PostingSkill"("postingId", "skillId");

-- CreateIndex
CREATE INDEX "ApplicationStatus_status_idx" ON "ApplicationStatus"("status");

-- CreateIndex
CREATE INDEX "ApplicationStatus_postingId_status_stageEnteredAt_idx" ON "ApplicationStatus"("postingId", "status", "stageEnteredAt");

-- CreateIndex
CREATE INDEX "ApplicationStatus_postingId_source_idx" ON "ApplicationStatus"("postingId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatus_postingId_applicantId_key" ON "ApplicationStatus"("postingId", "applicantId");

-- CreateIndex
CREATE INDEX "Interview_postingId_idx" ON "Interview"("postingId");

-- CreateIndex
CREATE INDEX "Interview_applicantId_idx" ON "Interview"("applicantId");

-- CreateIndex
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- CreateIndex
CREATE INDEX "Company_domain_idx" ON "Company"("domain");

-- CreateIndex
CREATE INDEX "Company_kind_demoExpiresAt_idx" ON "Company"("kind", "demoExpiresAt");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_role_idx" ON "CompanyMember"("companyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvite_token_key" ON "CompanyInvite"("token");

-- CreateIndex
CREATE INDEX "CompanyInvite_companyId_status_idx" ON "CompanyInvite"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyInvite_email_status_idx" ON "CompanyInvite"("email", "status");

-- CreateIndex
CREATE INDEX "CompanyJoinRequest_companyId_status_idx" ON "CompanyJoinRequest"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyJoinRequest_companyId_requesterId_status_key" ON "CompanyJoinRequest"("companyId", "requesterId", "status");

-- CreateIndex
CREATE INDEX "EmployerActivityLog_companyId_createdAt_idx" ON "EmployerActivityLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployerActivityLog_companyId_kind_createdAt_idx" ON "EmployerActivityLog"("companyId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "EmployerActivityLog_postingId_createdAt_idx" ON "EmployerActivityLog"("postingId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployerActivityLog_applicantId_createdAt_idx" ON "EmployerActivityLog"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicantTeamComment_applicationStatusId_createdAt_idx" ON "ApplicantTeamComment"("applicationStatusId", "createdAt");

-- CreateIndex
CREATE INDEX "PostingTeamMember_userId_idx" ON "PostingTeamMember"("userId");

-- CreateIndex
CREATE INDEX "PostingTeamMember_postingId_role_idx" ON "PostingTeamMember"("postingId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PostingTeamMember_postingId_userId_key" ON "PostingTeamMember"("postingId", "userId");

-- CreateIndex
CREATE INDEX "EmailTemplate_companyId_kind_idx" ON "EmailTemplate"("companyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScorecard_postingId_key" ON "InterviewScorecard"("postingId");

-- CreateIndex
CREATE INDEX "ScorecardSubmission_applicationStatusId_status_idx" ON "ScorecardSubmission"("applicationStatusId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScorecardSubmission_scorecardId_applicationStatusId_intervi_key" ON "ScorecardSubmission"("scorecardId", "applicationStatusId", "interviewerId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_digestSentAt_idx" ON "Notification"("userId", "digestSentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_companyId_key" ON "NotificationPreference"("userId", "companyId");

-- CreateIndex
CREATE INDEX "EmployerPresencePing_applicationStatusId_expiresAt_idx" ON "EmployerPresencePing"("applicationStatusId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmployerPresencePing_expiresAt_idx" ON "EmployerPresencePing"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerPresencePing_userId_applicationStatusId_key" ON "EmployerPresencePing"("userId", "applicationStatusId");

-- CreateIndex
CREATE INDEX "CourseFilterOption_type_sortOrder_idx" ON "CourseFilterOption"("type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CourseFilterOption_type_value_key" ON "CourseFilterOption"("type", "value");

-- CreateIndex
CREATE INDEX "InternshipPosting_status_createdAt_idx" ON "InternshipPosting"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InternshipPosting_companyId_status_createdAt_idx" ON "InternshipPosting"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UserSavedPosting_userId_createdAt_idx" ON "UserSavedPosting"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedPosting_userId_postingId_key" ON "UserSavedPosting"("userId", "postingId");

-- CreateIndex
CREATE INDEX "EventFormSubmission_formId_createdAt_idx" ON "EventFormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "EventFormSubmission_email_idx" ON "EventFormSubmission"("email");

-- CreateIndex
CREATE INDEX "EventFormSubmission_userId_idx" ON "EventFormSubmission"("userId");

-- CreateIndex
CREATE INDEX "EventFormSubmission_formId_reviewStatus_createdAt_idx" ON "EventFormSubmission"("formId", "reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "EventFormSubmission_formId_reviewStatus_leftPoolAt_idx" ON "EventFormSubmission"("formId", "reviewStatus", "leftPoolAt");

-- CreateIndex
CREATE INDEX "EventFormSubmission_formId_reviewStatus_eligibilityApproved_idx" ON "EventFormSubmission"("formId", "reviewStatus", "eligibilityApprovedAt", "leftPoolAt");

-- CreateIndex
CREATE INDEX "ApplicationComment_submissionId_createdAt_idx" ON "ApplicationComment"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationComment_authorId_createdAt_idx" ON "ApplicationComment"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoolExitFeedback_submissionId_key" ON "PoolExitFeedback"("submissionId");

-- CreateIndex
CREATE INDEX "PoolExitFeedback_createdAt_idx" ON "PoolExitFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "PoolExitFeedback_reason_createdAt_idx" ON "PoolExitFeedback"("reason", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackInvitation_token_key" ON "FeedbackInvitation"("token");

-- CreateIndex
CREATE INDEX "FeedbackInvitation_invitedById_createdAt_idx" ON "FeedbackInvitation"("invitedById", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackInvitation_token_expiresAt_idx" ON "FeedbackInvitation"("token", "expiresAt");

-- CreateIndex
CREATE INDEX "CourseFavorite_userId_idx" ON "CourseFavorite"("userId");

-- CreateIndex
CREATE INDEX "CourseFavorite_courseId_idx" ON "CourseFavorite"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseFavorite_userId_courseId_key" ON "CourseFavorite"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ScormPackage_courseId_key" ON "ScormPackage"("courseId");

-- CreateIndex
CREATE INDEX "ScormSession_userId_updatedAt_idx" ON "ScormSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ScormSession_userId_packageId_attemptNumber_idx" ON "ScormSession"("userId", "packageId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleProgress_userId_moduleId_key" ON "ModuleProgress"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "ReviewBookmark_userId_nextReviewAt_idx" ON "ReviewBookmark"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewBookmark_userId_questionId_key" ON "ReviewBookmark"("userId", "questionId");

-- CreateIndex
CREATE INDEX "ModuleCheckpoint_moduleId_orderIndex_idx" ON "ModuleCheckpoint"("moduleId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "XapiStatement_statementId_key" ON "XapiStatement"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_pathwayId_key" ON "Certificate"("userId", "pathwayId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationProgram_slug_key" ON "CertificationProgram"("slug");

-- CreateIndex
CREATE INDEX "CertificationLevel_programId_idx" ON "CertificationLevel"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationLevel_programId_tier_key" ON "CertificationLevel"("programId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationCredential_credentialNumber_key" ON "CertificationCredential"("credentialNumber");

-- CreateIndex
CREATE INDEX "CertificationCredential_userId_idx" ON "CertificationCredential"("userId");

-- CreateIndex
CREATE INDEX "CertificationCredential_programId_idx" ON "CertificationCredential"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationCredential_userId_levelId_key" ON "CertificationCredential"("userId", "levelId");

-- CreateIndex
CREATE INDEX "PathwayCohort_pathwayId_displayOrder_idx" ON "PathwayCohort"("pathwayId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCohort_pathwayId_slug_key" ON "PathwayCohort"("pathwayId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayCourse_pathwayId_courseId_key" ON "PathwayCourse"("pathwayId", "courseId");

-- CreateIndex
CREATE INDEX "PathwayEnrollment_pathwayId_status_enrolledAt_idx" ON "PathwayEnrollment"("pathwayId", "status", "enrolledAt");

-- CreateIndex
CREATE INDEX "PathwayEnrollment_cohortId_status_waitlistPosition_idx" ON "PathwayEnrollment"("cohortId", "status", "waitlistPosition");

-- CreateIndex
CREATE INDEX "PathwayEnrollment_cohortId_attended_idx" ON "PathwayEnrollment"("cohortId", "attended");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayEnrollment_userId_pathwayId_key" ON "PathwayEnrollment"("userId", "pathwayId");

-- CreateIndex
CREATE INDEX "CreditApplication_status_submittedAt_idx" ON "CreditApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "CreditApplication_userId_submittedAt_idx" ON "CreditApplication"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_type_expiresAt_idx" ON "CreditTransaction"("userId", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_expiresAt_expiredAt_idx" ON "CreditTransaction"("expiresAt", "expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCourse_groupId_courseId_key" ON "GroupCourse"("groupId", "courseId");

-- CreateIndex
CREATE INDEX "ElectronicSignature_signerId_performedAt_idx" ON "ElectronicSignature"("signerId", "performedAt");

-- CreateIndex
CREATE INDEX "ElectronicSignature_subjectType_subjectId_idx" ON "ElectronicSignature"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AIInteraction_createdAt_idx" ON "AIInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "AIInteraction_kind_createdAt_idx" ON "AIInteraction"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AIInteraction_flaggedForReview_reviewStatus_idx" ON "AIInteraction"("flaggedForReview", "reviewStatus");

-- CreateIndex
CREATE INDEX "EvalRun_createdAt_idx" ON "EvalRun"("createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_startedAt_idx" ON "AgentRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_hash_key" ON "Translation"("hash");

-- CreateIndex
CREATE INDEX "Translation_targetLang_idx" ON "Translation"("targetLang");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_userId_createdAt_idx" ON "DataSubjectRequest"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "EditableCopy_updatedAt_idx" ON "EditableCopy"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "BuddyPair_partnerId_status_idx" ON "BuddyPair"("partnerId", "status");

-- CreateIndex
CREATE INDEX "BuddyPair_initiatorId_status_idx" ON "BuddyPair"("initiatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BuddyPair_initiatorId_partnerId_key" ON "BuddyPair"("initiatorId", "partnerId");

-- CreateIndex
CREATE INDEX "BuddyMessage_pairId_createdAt_idx" ON "BuddyMessage"("pairId", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChangeRequest_status_createdAt_idx" ON "RoleChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChangeRequest_userId_createdAt_idx" ON "RoleChangeRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Event_name_createdAt_idx" ON "Event"("name", "createdAt");

-- CreateIndex
CREATE INDEX "Event_userId_createdAt_idx" ON "Event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MerchReward_status_unlockedAt_idx" ON "MerchReward"("status", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MerchReward_userId_tier_key" ON "MerchReward"("userId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchChecklistState_itemKey_key" ON "LaunchChecklistState"("itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "BhnEvent_slug_key" ON "BhnEvent"("slug");

-- CreateIndex
CREATE INDEX "BhnEvent_status_idx" ON "BhnEvent"("status");

-- CreateIndex
CREATE INDEX "EventReminder_scheduledAt_sentAt_idx" ON "EventReminder"("scheduledAt", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventReminder_eventId_kind_key" ON "EventReminder"("eventId", "kind");

-- CreateIndex
CREATE INDEX "EventHost_eventId_displayOrder_idx" ON "EventHost"("eventId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EventHost_eventId_userId_key" ON "EventHost"("eventId", "userId");

-- CreateIndex
CREATE INDEX "CustomRegQuestion_eventId_displayOrder_idx" ON "CustomRegQuestion"("eventId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRegQuestion_eventId_key_key" ON "CustomRegQuestion"("eventId", "key");

-- CreateIndex
CREATE INDEX "CustomRegAnswer_customRegQuestionId_idx" ON "CustomRegAnswer"("customRegQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRegAnswer_registrationId_customRegQuestionId_key" ON "CustomRegAnswer"("registrationId", "customRegQuestionId");

-- CreateIndex
CREATE INDEX "TicketType_eventId_displayOrder_idx" ON "TicketType"("eventId", "displayOrder");

-- CreateIndex
CREATE INDEX "EventBroadcast_eventId_createdAt_idx" ON "EventBroadcast"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Workshop_eventId_startDateTime_idx" ON "Workshop"("eventId", "startDateTime");

-- CreateIndex
CREATE INDEX "Workshop_eventId_isActive_idx" ON "Workshop"("eventId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_eventId_slug_key" ON "Workshop"("eventId", "slug");

-- CreateIndex
CREATE INDEX "WorkshopBooking_userId_status_idx" ON "WorkshopBooking"("userId", "status");

-- CreateIndex
CREATE INDEX "WorkshopBooking_workshopId_status_waitlistPosition_idx" ON "WorkshopBooking"("workshopId", "status", "waitlistPosition");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopBooking_workshopId_userId_key" ON "WorkshopBooking"("workshopId", "userId");

-- CreateIndex
CREATE INDEX "SymposiumSession_eventId_startTime_idx" ON "SymposiumSession"("eventId", "startTime");

-- CreateIndex
CREATE INDEX "SymposiumSession_eventId_breakoutGroupId_idx" ON "SymposiumSession"("eventId", "breakoutGroupId");

-- CreateIndex
CREATE INDEX "Speaker_eventId_idx" ON "Speaker"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_qrToken_key" ON "Registration"("qrToken");

-- CreateIndex
CREATE INDEX "Registration_eventId_registrationStatus_idx" ON "Registration"("eventId", "registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_userId_key" ON "Registration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_guestEmail_key" ON "Registration"("eventId", "guestEmail");

-- CreateIndex
CREATE INDEX "PersonalAgendaEntry_userId_idx" ON "PersonalAgendaEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAgendaEntry_userId_symposiumSessionId_key" ON "PersonalAgendaEntry"("userId", "symposiumSessionId");

-- CreateIndex
CREATE INDEX "Sponsor_eventId_idx" ON "Sponsor"("eventId");

-- CreateIndex
CREATE INDEX "SymposiumQuestion_symposiumSessionId_upvoteCount_idx" ON "SymposiumQuestion"("symposiumSessionId", "upvoteCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PollResponse_pollId_userId_key" ON "PollResponse"("pollId", "userId");

-- CreateIndex
CREATE INDEX "ThemeVote_themeId_sentiment_idx" ON "ThemeVote"("themeId", "sentiment");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeVote_userId_sentiment_themeId_key" ON "ThemeVote"("userId", "sentiment", "themeId");

-- CreateIndex
CREATE INDEX "ThemeProposal_status_createdAt_idx" ON "ThemeProposal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ThemeProposal_proposerId_idx" ON "ThemeProposal"("proposerId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchInsight_period_key" ON "ResearchInsight"("period");

-- CreateIndex
CREATE INDEX "ResearchInsight_createdAt_idx" ON "ResearchInsight"("createdAt");

-- CreateIndex
CREATE INDEX "PrepSession_userId_updatedAt_idx" ON "PrepSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PrepSession_postingId_idx" ON "PrepSession"("postingId");

-- CreateIndex
CREATE UNIQUE INDEX "PrepSession_userId_postingId_key" ON "PrepSession"("userId", "postingId");

-- CreateIndex
CREATE INDEX "StarStory_userId_updatedAt_idx" ON "StarStory"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StarStorySkill_skillId_idx" ON "StarStorySkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_applicationStatusId_key" ON "Offer"("applicationStatusId");

-- CreateIndex
CREATE INDEX "Offer_applicantId_status_idx" ON "Offer"("applicantId", "status");

-- CreateIndex
CREATE INDEX "Offer_postingId_status_idx" ON "Offer"("postingId", "status");

-- CreateIndex
CREATE INDEX "InterviewScore_interviewId_idx" ON "InterviewScore"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScore_interviewId_scorerUserId_key" ON "InterviewScore"("interviewId", "scorerUserId");

-- CreateIndex
CREATE INDEX "AssistEvent_userId_ts_idx" ON "AssistEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "AssistEvent_sessionId_ts_idx" ON "AssistEvent"("sessionId", "ts");

-- CreateIndex
CREATE INDEX "AssistEvent_kind_ts_idx" ON "AssistEvent"("kind", "ts");

-- CreateIndex
CREATE INDEX "AssistDailyRollup_userId_day_idx" ON "AssistDailyRollup"("userId", "day");

-- CreateIndex
CREATE INDEX "AssistDailyRollup_day_idx" ON "AssistDailyRollup"("day");

-- CreateIndex
CREATE UNIQUE INDEX "AssistDailyRollup_userId_surface_day_key" ON "AssistDailyRollup"("userId", "surface", "day");

-- CreateIndex
CREATE INDEX "AssistWeeklySummary_userId_weekStart_idx" ON "AssistWeeklySummary"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "AssistWeeklySummary_weekStart_idx" ON "AssistWeeklySummary"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "AssistWeeklySummary_userId_weekStart_key" ON "AssistWeeklySummary"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "AssistHint_userId_status_idx" ON "AssistHint"("userId", "status");

-- CreateIndex
CREATE INDEX "AssistHint_userId_createdAt_idx" ON "AssistHint"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistHint_helpKey_status_idx" ON "AssistHint"("helpKey", "status");

-- CreateIndex
CREATE INDEX "AssistHintFeedback_hintId_kind_idx" ON "AssistHintFeedback"("hintId", "kind");

-- CreateIndex
CREATE INDEX "AssistHintFeedback_userId_ts_idx" ON "AssistHintFeedback"("userId", "ts");

-- CreateIndex
CREATE INDEX "EquipApplication_userId_status_idx" ON "EquipApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "EquipApplication_status_submittedAt_idx" ON "EquipApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "EquipApplication_reviewerId_idx" ON "EquipApplication"("reviewerId");

-- CreateIndex
CREATE INDEX "EquipApplicationMessage_applicationId_createdAt_idx" ON "EquipApplicationMessage"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "CommitteeMembership_committee_active_idx" ON "CommitteeMembership"("committee", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeMembership_userId_committee_key" ON "CommitteeMembership"("userId", "committee");

-- CreateIndex
CREATE INDEX "EquipDeadline_stream_status_deadlineAt_idx" ON "EquipDeadline"("stream", "status", "deadlineAt");

-- CreateIndex
CREATE INDEX "EquipDeadline_deadlineAt_idx" ON "EquipDeadline"("deadlineAt");

-- CreateIndex
CREATE INDEX "OpportunityDeadline_pillar_status_displayOrder_idx" ON "OpportunityDeadline"("pillar", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "OpportunityDeadline_deadlineAt_idx" ON "OpportunityDeadline"("deadlineAt");

-- CreateIndex
CREATE INDEX "OpportunityDeadline_kind_idx" ON "OpportunityDeadline"("kind");

-- CreateIndex
CREATE INDEX "HqpApplicationWindow_year_idx" ON "HqpApplicationWindow"("year");

-- CreateIndex
CREATE INDEX "HqpApplicationWindow_status_opensAt_closesAt_idx" ON "HqpApplicationWindow"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "HqpMemberApplication_windowId_status_idx" ON "HqpMemberApplication"("windowId", "status");

-- CreateIndex
CREATE INDEX "HqpMemberApplication_userId_idx" ON "HqpMemberApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HqpMemberApplication_userId_windowId_key" ON "HqpMemberApplication"("userId", "windowId");

-- CreateIndex
CREATE INDEX "HqpFeedbackRound_status_opensAt_closesAt_idx" ON "HqpFeedbackRound"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "HqpFeedbackResponse_roundId_status_idx" ON "HqpFeedbackResponse"("roundId", "status");

-- CreateIndex
CREATE INDEX "HqpFeedbackResponse_userId_idx" ON "HqpFeedbackResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HqpFeedbackResponse_roundId_userId_key" ON "HqpFeedbackResponse"("roundId", "userId");

-- CreateIndex
CREATE INDEX "HqpMeeting_scheduledAt_idx" ON "HqpMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "HqpMeeting_status_scheduledAt_idx" ON "HqpMeeting"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "HqpMeetingAttendance_meetingId_status_idx" ON "HqpMeetingAttendance"("meetingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HqpMeetingAttendance_meetingId_userId_key" ON "HqpMeetingAttendance"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "HqpActionItem_status_dueOn_idx" ON "HqpActionItem"("status", "dueOn");

-- CreateIndex
CREATE INDEX "HqpActionItem_assignedToId_status_idx" ON "HqpActionItem"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "HqpActionItem_meetingId_idx" ON "HqpActionItem"("meetingId");

-- CreateIndex
CREATE INDEX "HqpCoiDisclosure_userId_active_idx" ON "HqpCoiDisclosure"("userId", "active");

-- CreateIndex
CREATE INDEX "HqpCoiDisclosure_active_declaredAt_idx" ON "HqpCoiDisclosure"("active", "declaredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_audience_idx" ON "Page"("status", "audience");

-- CreateIndex
CREATE INDEX "Page_updatedAt_idx" ON "Page"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_sourceHash_key" ON "Simulation"("sourceHash");

-- CreateIndex
CREATE INDEX "Simulation_sourceUrl_idx" ON "Simulation"("sourceUrl");

-- CreateIndex
CREATE INDEX "Simulation_createdAt_idx" ON "Simulation"("createdAt");

-- CreateIndex
CREATE INDEX "SimulationRequest_status_createdAt_idx" ON "SimulationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationRequest_userId_status_idx" ON "SimulationRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "SimulationRequest_sourceHash_idx" ON "SimulationRequest"("sourceHash");

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_updatedAt_idx" ON "SimulationAttempt"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SimulationAttempt_simulationId_idx" ON "SimulationAttempt"("simulationId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationShareToken_token_key" ON "SimulationShareToken"("token");

-- CreateIndex
CREATE INDEX "SimulationShareToken_simulationId_createdAt_idx" ON "SimulationShareToken"("simulationId", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationComment_simulationId_createdAt_idx" ON "SimulationComment"("simulationId", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationComment_ip_createdAt_idx" ON "SimulationComment"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "Resume_userId_isArchived_idx" ON "Resume"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Resume_derivedFromId_idx" ON "Resume"("derivedFromId");

-- CreateIndex
CREATE INDEX "ResumeComment_resumeId_createdAt_idx" ON "ResumeComment"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeComment_authorId_idx" ON "ResumeComment"("authorId");

-- CreateIndex
CREATE INDEX "ResumeRevision_resumeId_version_idx" ON "ResumeRevision"("resumeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MasterResume_userId_key" ON "MasterResume"("userId");

-- CreateIndex
CREATE INDEX "MasterBullet_masterId_sectionKind_isArchived_idx" ON "MasterBullet"("masterId", "sectionKind", "isArchived");

-- CreateIndex
CREATE INDEX "MasterBullet_masterId_anchorTitle_idx" ON "MasterBullet"("masterId", "anchorTitle");

-- CreateIndex
CREATE INDEX "MasterBulletRevision_bulletId_createdAt_idx" ON "MasterBulletRevision"("bulletId", "createdAt");

-- CreateIndex
CREATE INDEX "MasterSnapshot_masterId_createdAt_idx" ON "MasterSnapshot"("masterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterSnapshot_masterId_versionNumber_key" ON "MasterSnapshot"("masterId", "versionNumber");

-- CreateIndex
CREATE INDEX "TailoringJob_userId_createdAt_idx" ON "TailoringJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TailoringRun_userId_createdAt_idx" ON "TailoringRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TailoringRun_jobId_idx" ON "TailoringRun"("jobId");

-- CreateIndex
CREATE INDEX "TailoringRule_userId_scope_isActive_idx" ON "TailoringRule"("userId", "scope", "isActive");

-- CreateIndex
CREATE INDEX "TailoringCorrection_runId_idx" ON "TailoringCorrection"("runId");

-- CreateIndex
CREATE INDEX "JobFolder_userId_isArchived_idx" ON "JobFolder"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "JobFolder_resumeId_idx" ON "JobFolder"("resumeId");

-- CreateIndex
CREATE INDEX "JobFolder_simulationRequestId_idx" ON "JobFolder"("simulationRequestId");

-- CreateIndex
CREATE INDEX "JobFolder_userId_deadline_idx" ON "JobFolder"("userId", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "JobFolderShareToken_token_key" ON "JobFolderShareToken"("token");

-- CreateIndex
CREATE INDEX "JobFolderShareToken_folderId_createdAt_idx" ON "JobFolderShareToken"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "JobFolderEvent_folderId_createdAt_idx" ON "JobFolderEvent"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "Facility_province_idx" ON "Facility"("province");

-- CreateIndex
CREATE INDEX "Facility_city_idx" ON "Facility"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_name_key" ON "Facility"("name");

-- CreateIndex
CREATE INDEX "ShowcaseSubmission_programSlug_createdAt_idx" ON "ShowcaseSubmission"("programSlug", "createdAt");

-- CreateIndex
CREATE INDEX "ShowcaseSubmission_programSlug_userId_idx" ON "ShowcaseSubmission"("programSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseGroup_slug_key" ON "ShowcaseGroup"("slug");

-- CreateIndex
CREATE INDEX "ShowcaseGroup_createdAt_idx" ON "ShowcaseGroup"("createdAt");

-- CreateIndex
CREATE INDEX "ShowcaseGroup_pathwayId_idx" ON "ShowcaseGroup"("pathwayId");

-- CreateIndex
CREATE INDEX "ShowcaseGroup_linkedCohortId_idx" ON "ShowcaseGroup"("linkedCohortId");

-- CreateIndex
CREATE INDEX "ShowcaseMembership_groupId_idx" ON "ShowcaseMembership"("groupId");

-- CreateIndex
CREATE INDEX "ShowcaseMembership_submissionId_idx" ON "ShowcaseMembership"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseMembership_submissionId_groupId_key" ON "ShowcaseMembership"("submissionId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcasePathway_slug_key" ON "ShowcasePathway"("slug");

-- CreateIndex
CREATE INDEX "ShowcasePathway_createdAt_idx" ON "ShowcasePathway"("createdAt");

-- CreateIndex
CREATE INDEX "ShowcasePathway_linkedPathwayId_idx" ON "ShowcasePathway"("linkedPathwayId");

-- CreateIndex
CREATE INDEX "HiringTarget_companyId_metricKey_idx" ON "HiringTarget"("companyId", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "HiringTarget_companyId_postingId_metricKey_period_key" ON "HiringTarget"("companyId", "postingId", "metricKey", "period");

-- CreateIndex
CREATE INDEX "RecruitingCost_companyId_incurredAt_idx" ON "RecruitingCost"("companyId", "incurredAt");

-- CreateIndex
CREATE INDEX "RecruitingCost_postingId_idx" ON "RecruitingCost"("postingId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDemographics_applicationStatusId_key" ON "ApplicationDemographics"("applicationStatusId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_postingId_toStage_changedAt_idx" ON "ApplicationStatusHistory"("postingId", "toStage", "changedAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationStatusId_changedAt_idx" ON "ApplicationStatusHistory"("applicationStatusId", "changedAt");

-- CreateIndex
CREATE INDEX "SharedFile_category_isArchived_idx" ON "SharedFile"("category", "isArchived");

-- CreateIndex
CREATE INDEX "VideoProject_category_isArchived_idx" ON "VideoProject"("category", "isArchived");

-- CreateIndex
CREATE INDEX "Script_projectId_isArchived_idx" ON "Script"("projectId", "isArchived");

-- CreateIndex
CREATE INDEX "ScriptSection_scriptId_order_idx" ON "ScriptSection"("scriptId", "order");

-- CreateIndex
CREATE INDEX "ScriptRevision_scriptId_createdAt_idx" ON "ScriptRevision"("scriptId", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptComment_scriptId_createdAt_idx" ON "ScriptComment"("scriptId", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptComment_parentId_idx" ON "ScriptComment"("parentId");

-- CreateIndex
CREATE INDEX "ScriptCollaborator_scriptId_lastSeenAt_idx" ON "ScriptCollaborator"("scriptId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptShareToken_token_key" ON "ScriptShareToken"("token");

-- CreateIndex
CREATE INDEX "ScriptShareToken_scriptId_createdAt_idx" ON "ScriptShareToken"("scriptId", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptPresence_scriptId_lastSeenAt_idx" ON "ScriptPresence"("scriptId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptPresence_scriptId_editorKey_key" ON "ScriptPresence"("scriptId", "editorKey");

-- CreateIndex
CREATE INDEX "OutreachList_order_idx" ON "OutreachList"("order");

-- CreateIndex
CREATE INDEX "OutreachContact_listId_order_idx" ON "OutreachContact"("listId", "order");

-- CreateIndex
CREATE INDEX "OutreachMembership_listId_order_idx" ON "OutreachMembership"("listId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMembership_listId_personId_key" ON "OutreachMembership"("listId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachShareToken_token_key" ON "OutreachShareToken"("token");

-- CreateIndex
CREATE INDEX "OutreachShareToken_listId_createdAt_idx" ON "OutreachShareToken"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachCollaborator_listId_lastSeenAt_idx" ON "OutreachCollaborator"("listId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "OutreachTouch_personId_happenedAt_idx" ON "OutreachTouch"("personId", "happenedAt");

-- CreateIndex
CREATE INDEX "OutreachCampaign_createdAt_idx" ON "OutreachCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "MockInterview_userId_createdAt_idx" ON "MockInterview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MockInterviewAnswer_interviewId_order_idx" ON "MockInterviewAnswer"("interviewId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EquipReportShareToken_token_key" ON "EquipReportShareToken"("token");

-- CreateIndex
CREATE INDEX "EquipReportShareToken_createdAt_idx" ON "EquipReportShareToken"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterIssue_status_createdAt_idx" ON "NewsletterIssue"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterPiece_issueId_section_position_idx" ON "NewsletterPiece"("issueId", "section", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PageReview_shareToken_key" ON "PageReview"("shareToken");

-- CreateIndex
CREATE INDEX "PageReview_status_updatedAt_idx" ON "PageReview"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "PageComment_reviewId_createdAt_idx" ON "PageComment"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "PageComment_parentId_idx" ON "PageComment"("parentId");

-- CreateIndex
CREATE INDEX "AdvisorSession_startsAt_status_idx" ON "AdvisorSession"("startsAt", "status");

-- CreateIndex
CREATE INDEX "AdvisorBooking_userId_status_idx" ON "AdvisorBooking"("userId", "status");

-- CreateIndex
CREATE INDEX "AdvisorBooking_sessionId_status_idx" ON "AdvisorBooking"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorBooking_sessionId_userId_key" ON "AdvisorBooking"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAlias" ADD CONSTRAINT "SkillAlias_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSkill" ADD CONSTRAINT "CourseSkill_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSkill" ADD CONSTRAINT "CourseSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingSkill" ADD CONSTRAINT "PostingSkill_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingSkill" ADD CONSTRAINT "PostingSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatus" ADD CONSTRAINT "ApplicationStatus_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatus" ADD CONSTRAINT "ApplicationStatus_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatus" ADD CONSTRAINT "ApplicationStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatus" ADD CONSTRAINT "ApplicationStatus_lastTouchedById_fkey" FOREIGN KEY ("lastTouchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJoinRequest" ADD CONSTRAINT "CompanyJoinRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJoinRequest" ADD CONSTRAINT "CompanyJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJoinRequest" ADD CONSTRAINT "CompanyJoinRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerActivityLog" ADD CONSTRAINT "EmployerActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerActivityLog" ADD CONSTRAINT "EmployerActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerActivityLog" ADD CONSTRAINT "EmployerActivityLog_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerActivityLog" ADD CONSTRAINT "EmployerActivityLog_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerActivityLog" ADD CONSTRAINT "EmployerActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantTeamComment" ADD CONSTRAINT "ApplicantTeamComment_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantTeamComment" ADD CONSTRAINT "ApplicantTeamComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantTeamComment" ADD CONSTRAINT "ApplicantTeamComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ApplicantTeamComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingTeamMember" ADD CONSTRAINT "PostingTeamMember_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingTeamMember" ADD CONSTRAINT "PostingTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingTeamMember" ADD CONSTRAINT "PostingTeamMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardSubmission" ADD CONSTRAINT "ScorecardSubmission_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "InterviewScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardSubmission" ADD CONSTRAINT "ScorecardSubmission_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardSubmission" ADD CONSTRAINT "ScorecardSubmission_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "EmployerActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerPresencePing" ADD CONSTRAINT "EmployerPresencePing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipPosting" ADD CONSTRAINT "InternshipPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipPosting" ADD CONSTRAINT "InternshipPosting_lastTouchedById_fkey" FOREIGN KEY ("lastTouchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPosting" ADD CONSTRAINT "UserSavedPosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPosting" ADD CONSTRAINT "UserSavedPosting_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFormSubmission" ADD CONSTRAINT "EventFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "EventForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFormSubmission" ADD CONSTRAINT "EventFormSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EventFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolExitFeedback" ADD CONSTRAINT "PoolExitFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EventFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolExitFeedback" ADD CONSTRAINT "PoolExitFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackInvitation" ADD CONSTRAINT "FeedbackInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackInvitation" ADD CONSTRAINT "FeedbackInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFavorite" ADD CONSTRAINT "CourseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFavorite" ADD CONSTRAINT "CourseFavorite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormPackage" ADD CONSTRAINT "ScormPackage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormSession" ADD CONSTRAINT "ScormSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormSession" ADD CONSTRAINT "ScormSession_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ScormPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleProgress" ADD CONSTRAINT "ModuleProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewBookmark" ADD CONSTRAINT "ReviewBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewBookmark" ADD CONSTRAINT "ReviewBookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCheckpoint" ADD CONSTRAINT "ModuleCheckpoint_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCheckpoint" ADD CONSTRAINT "ModuleCheckpoint_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XapiStatement" ADD CONSTRAINT "XapiStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationLevel" ADD CONSTRAINT "CertificationLevel_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CertificationProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CertificationProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationCredential" ADD CONSTRAINT "CertificationCredential_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CertificationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCohort" ADD CONSTRAINT "PathwayCohort_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCourse" ADD CONSTRAINT "PathwayCourse_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayCourse" ADD CONSTRAINT "PathwayCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayEnrollment" ADD CONSTRAINT "PathwayEnrollment_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayEnrollment" ADD CONSTRAINT "PathwayEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCourse" ADD CONSTRAINT "GroupCourse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCourse" ADD CONSTRAINT "GroupCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "BuddyPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleChangeRequest" ADD CONSTRAINT "RoleChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleChangeRequest" ADD CONSTRAINT "RoleChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchReward" ADD CONSTRAINT "MerchReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchReward" ADD CONSTRAINT "MerchReward_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchChecklistState" ADD CONSTRAINT "LaunchChecklistState_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchChecklistState" ADD CONSTRAINT "LaunchChecklistState_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRegQuestion" ADD CONSTRAINT "CustomRegQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRegAnswer" ADD CONSTRAINT "CustomRegAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRegAnswer" ADD CONSTRAINT "CustomRegAnswer_customRegQuestionId_fkey" FOREIGN KEY ("customRegQuestionId") REFERENCES "CustomRegQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBroadcast" ADD CONSTRAINT "EventBroadcast_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBroadcast" ADD CONSTRAINT "EventBroadcast_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBooking" ADD CONSTRAINT "WorkshopBooking_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBooking" ADD CONSTRAINT "WorkshopBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopBooking" ADD CONSTRAINT "WorkshopBooking_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumSession" ADD CONSTRAINT "SymposiumSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Speaker" ADD CONSTRAINT "Speaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumSessionSpeaker" ADD CONSTRAINT "SymposiumSessionSpeaker_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SymposiumSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumSessionSpeaker" ADD CONSTRAINT "SymposiumSessionSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAgendaEntry" ADD CONSTRAINT "PersonalAgendaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAgendaEntry" ADD CONSTRAINT "PersonalAgendaEntry_symposiumSessionId_fkey" FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BhnEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumQuestion" ADD CONSTRAINT "SymposiumQuestion_symposiumSessionId_fkey" FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumQuestion" ADD CONSTRAINT "SymposiumQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumQuestionVote" ADD CONSTRAINT "SymposiumQuestionVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SymposiumQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymposiumQuestionVote" ADD CONSTRAINT "SymposiumQuestionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_symposiumSessionId_fkey" FOREIGN KEY ("symposiumSessionId") REFERENCES "SymposiumSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResponse" ADD CONSTRAINT "PollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResponse" ADD CONSTRAINT "PollResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeVote" ADD CONSTRAINT "ThemeVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeProposal" ADD CONSTRAINT "ThemeProposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeProposal" ADD CONSTRAINT "ThemeProposal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchInsight" ADD CONSTRAINT "ResearchInsight_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchInsight" ADD CONSTRAINT "ResearchInsight_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepSession" ADD CONSTRAINT "PrepSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepSession" ADD CONSTRAINT "PrepSession_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarStory" ADD CONSTRAINT "StarStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarStory" ADD CONSTRAINT "StarStory_sourcePostingId_fkey" FOREIGN KEY ("sourcePostingId") REFERENCES "InternshipPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarStorySkill" ADD CONSTRAINT "StarStorySkill_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StarStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarStorySkill" ADD CONSTRAINT "StarStorySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_scorerUserId_fkey" FOREIGN KEY ("scorerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistEvent" ADD CONSTRAINT "AssistEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistDailyRollup" ADD CONSTRAINT "AssistDailyRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistWeeklySummary" ADD CONSTRAINT "AssistWeeklySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistHint" ADD CONSTRAINT "AssistHint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistHintFeedback" ADD CONSTRAINT "AssistHintFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistHintFeedback" ADD CONSTRAINT "AssistHintFeedback_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "AssistHint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistPreferences" ADD CONSTRAINT "AssistPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipApplication" ADD CONSTRAINT "EquipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipApplication" ADD CONSTRAINT "EquipApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipApplicationMessage" ADD CONSTRAINT "EquipApplicationMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EquipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipApplicationMessage" ADD CONSTRAINT "EquipApplicationMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT "CommitteeMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipDeadline" ADD CONSTRAINT "EquipDeadline_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipDeadline" ADD CONSTRAINT "EquipDeadline_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipDeadline" ADD CONSTRAINT "EquipDeadline_extendedById_fkey" FOREIGN KEY ("extendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpApplicationWindow" ADD CONSTRAINT "HqpApplicationWindow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMemberApplication" ADD CONSTRAINT "HqpMemberApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMemberApplication" ADD CONSTRAINT "HqpMemberApplication_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "HqpApplicationWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMemberApplication" ADD CONSTRAINT "HqpMemberApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpFeedbackRound" ADD CONSTRAINT "HqpFeedbackRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpFeedbackResponse" ADD CONSTRAINT "HqpFeedbackResponse_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "HqpFeedbackRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpFeedbackResponse" ADD CONSTRAINT "HqpFeedbackResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMeeting" ADD CONSTRAINT "HqpMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMeetingAttendance" ADD CONSTRAINT "HqpMeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "HqpMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpMeetingAttendance" ADD CONSTRAINT "HqpMeetingAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpActionItem" ADD CONSTRAINT "HqpActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "HqpMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpActionItem" ADD CONSTRAINT "HqpActionItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpActionItem" ADD CONSTRAINT "HqpActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqpCoiDisclosure" ADD CONSTRAINT "HqpCoiDisclosure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRequest" ADD CONSTRAINT "SimulationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRequest" ADD CONSTRAINT "SimulationRequest_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRequest" ADD CONSTRAINT "SimulationRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationShareToken" ADD CONSTRAINT "SimulationShareToken_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationComment" ADD CONSTRAINT "SimulationComment_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_derivedFromId_fkey" FOREIGN KEY ("derivedFromId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeComment" ADD CONSTRAINT "ResumeComment_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeComment" ADD CONSTRAINT "ResumeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeRevision" ADD CONSTRAINT "ResumeRevision_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterResume" ADD CONSTRAINT "MasterResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterBullet" ADD CONSTRAINT "MasterBullet_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterBulletRevision" ADD CONSTRAINT "MasterBulletRevision_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "MasterBullet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterSnapshot" ADD CONSTRAINT "MasterSnapshot_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringJob" ADD CONSTRAINT "TailoringJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringRun" ADD CONSTRAINT "TailoringRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringRun" ADD CONSTRAINT "TailoringRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TailoringJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringRule" ADD CONSTRAINT "TailoringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringCorrection" ADD CONSTRAINT "TailoringCorrection_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TailoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringCorrection" ADD CONSTRAINT "TailoringCorrection_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TailoringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFolder" ADD CONSTRAINT "JobFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFolder" ADD CONSTRAINT "JobFolder_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFolder" ADD CONSTRAINT "JobFolder_simulationRequestId_fkey" FOREIGN KEY ("simulationRequestId") REFERENCES "SimulationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFolderShareToken" ADD CONSTRAINT "JobFolderShareToken_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "JobFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFolderEvent" ADD CONSTRAINT "JobFolderEvent_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "JobFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseGroup" ADD CONSTRAINT "ShowcaseGroup_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "ShowcasePathway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseGroup" ADD CONSTRAINT "ShowcaseGroup_linkedCohortId_fkey" FOREIGN KEY ("linkedCohortId") REFERENCES "PathwayCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseMembership" ADD CONSTRAINT "ShowcaseMembership_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ShowcaseSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseMembership" ADD CONSTRAINT "ShowcaseMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ShowcaseGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcasePathway" ADD CONSTRAINT "ShowcasePathway_linkedPathwayId_fkey" FOREIGN KEY ("linkedPathwayId") REFERENCES "Pathway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringTarget" ADD CONSTRAINT "HiringTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingCost" ADD CONSTRAINT "RecruitingCost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDemographics" ADD CONSTRAINT "ApplicationDemographics_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptSection" ADD CONSTRAINT "ScriptSection_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptRevision" ADD CONSTRAINT "ScriptRevision_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptComment" ADD CONSTRAINT "ScriptComment_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptCollaborator" ADD CONSTRAINT "ScriptCollaborator_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptShareToken" ADD CONSTRAINT "ScriptShareToken_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptPresence" ADD CONSTRAINT "ScriptPresence_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMembership" ADD CONSTRAINT "OutreachMembership_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMembership" ADD CONSTRAINT "OutreachMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "OutreachPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachShareToken" ADD CONSTRAINT "OutreachShareToken_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCollaborator" ADD CONSTRAINT "OutreachCollaborator_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "OutreachPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OutreachList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewAnswer" ADD CONSTRAINT "MockInterviewAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "MockInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterPiece" ADD CONSTRAINT "NewsletterPiece_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageComment" ADD CONSTRAINT "PageComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PageReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorSession" ADD CONSTRAINT "AdvisorSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorBooking" ADD CONSTRAINT "AdvisorBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdvisorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorBooking" ADD CONSTRAINT "AdvisorBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

