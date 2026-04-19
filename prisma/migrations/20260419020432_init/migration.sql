-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INSTRUCTIONAL_DESIGNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RigorLevel" AS ENUM ('INTRODUCTORY', 'STANDARD', 'RIGOROUS', 'EXAM_LEVEL');

-- CreateEnum
CREATE TYPE "CoachTone" AS ENUM ('FORMAL', 'CONVERSATIONAL', 'EXAM_STYLE');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('TURN_LIMIT', 'TIMER', 'STUDENT_ENDED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INSTRUCTIONAL_DESIGNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "lmsName" TEXT,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorizationEndpoint" TEXT NOT NULL,
    "tokenEndpoint" TEXT NOT NULL,
    "jwksUri" TEXT NOT NULL,
    "deploymentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectTag" TEXT NOT NULL,
    "assignmentText" TEXT NOT NULL,
    "briefContext" TEXT NOT NULL,
    "rigor" "RigorLevel" NOT NULL DEFAULT 'STANDARD',
    "focusInstructions" TEXT,
    "turnLimit" INTEGER NOT NULL DEFAULT 10,
    "timerMinutes" INTEGER,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "coachName" TEXT NOT NULL DEFAULT 'Socrates',
    "coachTone" "CoachTone" NOT NULL DEFAULT 'FORMAL',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiLaunch" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "ltiUserId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT,
    "resourceLinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LtiLaunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "launchId" TEXT NOT NULL,
    "studentName" TEXT,
    "studentLtiSub" TEXT NOT NULL,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "endReason" "EndReason",
    "countsAsAttempt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "analysisJson" JSONB NOT NULL,
    "elementsAddressed" TEXT[],
    "elementsMissed" TEXT[],
    "depthReached" TEXT NOT NULL,
    "reasoningQuality" TEXT NOT NULL,
    "gapsFlagged" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionToken_key" ON "AuthSession"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_issuer_clientId_key" ON "Platform"("issuer", "clientId");

-- CreateIndex
CREATE INDEX "LtiLaunch_ltiUserId_activityId_idx" ON "LtiLaunch"("ltiUserId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachSession_launchId_key" ON "CoachSession"("launchId");

-- CreateIndex
CREATE INDEX "CoachSession_activityId_studentLtiSub_idx" ON "CoachSession"("activityId", "studentLtiSub");

-- CreateIndex
CREATE UNIQUE INDEX "SessionReport_sessionId_key" ON "SessionReport"("sessionId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiLaunch" ADD CONSTRAINT "LtiLaunch_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiLaunch" ADD CONSTRAINT "LtiLaunch_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "LtiLaunch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
