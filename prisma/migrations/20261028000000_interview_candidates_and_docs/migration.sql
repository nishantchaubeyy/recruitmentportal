-- CreateTable: InterviewCandidate
CREATE TABLE IF NOT EXISTS "InterviewCandidate" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DocumentRequest
CREATE TABLE IF NOT EXISTS "DocumentRequest" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "requestedById" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DocumentRequestItem
CREATE TABLE IF NOT EXISTS "DocumentRequestItem" (
    "id" TEXT NOT NULL,
    "documentRequestId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CandidateDocument
CREATE TABLE IF NOT EXISTS "CandidateDocument" (
    "id" TEXT NOT NULL,
    "documentRequestItemId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);

-- Indexes for InterviewCandidate
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewCandidate_interviewId_candidateId_key" ON "InterviewCandidate"("interviewId", "candidateId");
CREATE INDEX IF NOT EXISTS "InterviewCandidate_interviewId_idx" ON "InterviewCandidate"("interviewId");
CREATE INDEX IF NOT EXISTS "InterviewCandidate_candidateId_idx" ON "InterviewCandidate"("candidateId");
CREATE INDEX IF NOT EXISTS "InterviewCandidate_applicationId_idx" ON "InterviewCandidate"("applicationId");

-- Indexes for DocumentRequest
CREATE INDEX IF NOT EXISTS "DocumentRequest_candidateId_idx" ON "DocumentRequest"("candidateId");
CREATE INDEX IF NOT EXISTS "DocumentRequest_applicationId_idx" ON "DocumentRequest"("applicationId");
CREATE INDEX IF NOT EXISTS "DocumentRequest_status_idx" ON "DocumentRequest"("status");
CREATE INDEX IF NOT EXISTS "DocumentRequest_deadline_idx" ON "DocumentRequest"("deadline");

-- Indexes for DocumentRequestItem
CREATE INDEX IF NOT EXISTS "DocumentRequestItem_documentRequestId_idx" ON "DocumentRequestItem"("documentRequestId");
CREATE INDEX IF NOT EXISTS "DocumentRequestItem_status_idx" ON "DocumentRequestItem"("status");

-- Indexes for CandidateDocument
CREATE INDEX IF NOT EXISTS "CandidateDocument_documentRequestItemId_idx" ON "CandidateDocument"("documentRequestItemId");
CREATE INDEX IF NOT EXISTS "CandidateDocument_candidateId_idx" ON "CandidateDocument"("candidateId");
CREATE INDEX IF NOT EXISTS "CandidateDocument_verificationStatus_idx" ON "CandidateDocument"("verificationStatus");

-- Foreign Keys for InterviewCandidate
ALTER TABLE "InterviewCandidate" DROP CONSTRAINT IF EXISTS "InterviewCandidate_interviewId_fkey";
ALTER TABLE "InterviewCandidate" ADD CONSTRAINT "InterviewCandidate_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InterviewCandidate" DROP CONSTRAINT IF EXISTS "InterviewCandidate_candidateId_fkey";
ALTER TABLE "InterviewCandidate" ADD CONSTRAINT "InterviewCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InterviewCandidate" DROP CONSTRAINT IF EXISTS "InterviewCandidate_applicationId_fkey";
ALTER TABLE "InterviewCandidate" ADD CONSTRAINT "InterviewCandidate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys for DocumentRequest
ALTER TABLE "DocumentRequest" DROP CONSTRAINT IF EXISTS "DocumentRequest_candidateId_fkey";
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" DROP CONSTRAINT IF EXISTS "DocumentRequest_applicationId_fkey";
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" DROP CONSTRAINT IF EXISTS "DocumentRequest_requestedById_fkey";
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys for DocumentRequestItem
ALTER TABLE "DocumentRequestItem" DROP CONSTRAINT IF EXISTS "DocumentRequestItem_documentRequestId_fkey";
ALTER TABLE "DocumentRequestItem" ADD CONSTRAINT "DocumentRequestItem_documentRequestId_fkey" FOREIGN KEY ("documentRequestId") REFERENCES "DocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys for CandidateDocument
ALTER TABLE "CandidateDocument" DROP CONSTRAINT IF EXISTS "CandidateDocument_documentRequestItemId_fkey";
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_documentRequestItemId_fkey" FOREIGN KEY ("documentRequestItemId") REFERENCES "DocumentRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateDocument" DROP CONSTRAINT IF EXISTS "CandidateDocument_candidateId_fkey";
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateDocument" DROP CONSTRAINT IF EXISTS "CandidateDocument_verifiedById_fkey";
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Test Panel
INSERT INTO "InterviewPanel" ("id", "name", "code", "description", "createdAt", "updatedAt")
VALUES ('05f07c3a-82e6-45f9-a031-45053a948b80', 'Test Panel', 'TEST', 'Test panel for email verification and end-to-end testing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = 'Test Panel';

INSERT INTO "PanelMember" ("id", "panelId", "name", "email", "designation", "isActive", "createdAt", "updatedAt")
VALUES (
    '5101f98c-bd69-4b28-a73b-5be2100e02a5',
    '05f07c3a-82e6-45f9-a031-45053a948b80',
    'Nishant Chaubey (Admin)',
    'nishantchaubey8004@gmail.com',
    'Portal Administrator',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("panelId", "email") DO UPDATE SET "isActive" = true, "name" = 'Nishant Chaubey (Admin)';
