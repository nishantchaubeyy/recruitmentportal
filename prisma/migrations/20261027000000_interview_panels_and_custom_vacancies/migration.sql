-- DropForeignKey
ALTER TABLE "InterviewPanel" DROP CONSTRAINT IF EXISTS "InterviewPanel_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewPanel" DROP CONSTRAINT IF EXISTS "InterviewPanel_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "InterviewPanel_interviewId_userId_key";

-- DropIndex
DROP INDEX IF EXISTS "InterviewPanel_userId_idx";

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "createdById" TEXT,
ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "panelId" TEXT,
ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "zoomJoinUrl" TEXT,
ADD COLUMN IF NOT EXISTS "zoomStartUrl" TEXT,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "time" SET DEFAULT '10:00 AM';

-- AlterTable
ALTER TABLE "InterviewPanel" DROP COLUMN IF EXISTS "interviewId",
DROP COLUMN IF EXISTS "userId",
ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customCategory" TEXT,
ADD COLUMN IF NOT EXISTS "customLabel" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PanelMember" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "designation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InterviewPanelist" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "InterviewPanelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PanelMember_panelId_email_key" ON "PanelMember"("panelId", "email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewPanelist_interviewId_memberId_key" ON "InterviewPanelist"("interviewId", "memberId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Interview_panelId_idx" ON "Interview"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InterviewPanel_code_key" ON "InterviewPanel"("code");

-- AddForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT IF EXISTS "Interview_panelId_fkey";
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "InterviewPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT IF EXISTS "Interview_createdById_fkey";
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMember" DROP CONSTRAINT IF EXISTS "PanelMember_panelId_fkey";
ALTER TABLE "PanelMember" ADD CONSTRAINT "PanelMember_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "InterviewPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelist" DROP CONSTRAINT IF EXISTS "InterviewPanelist_interviewId_fkey";
ALTER TABLE "InterviewPanelist" ADD CONSTRAINT "InterviewPanelist_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelist" DROP CONSTRAINT IF EXISTS "InterviewPanelist_memberId_fkey";
ALTER TABLE "InterviewPanelist" ADD CONSTRAINT "InterviewPanelist_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PanelMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
