-- DropForeignKey
ALTER TABLE "CoachSession" DROP CONSTRAINT "CoachSession_launchId_fkey";

-- AlterTable
ALTER TABLE "CoachSession" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testerId" TEXT,
ALTER COLUMN "launchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_launchId_fkey" FOREIGN KEY ("launchId") REFERENCES "LtiLaunch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
