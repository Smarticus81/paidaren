-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "message" TEXT,
    "metadata" JSONB,
    "userId" TEXT,
    "userEmail" TEXT,
    "path" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryEvent_kind_createdAt_idx" ON "TelemetryEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "TelemetryEvent_createdAt_idx" ON "TelemetryEvent"("createdAt");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_idx" ON "TelemetryEvent"("userId");

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AdminSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("key")
);
