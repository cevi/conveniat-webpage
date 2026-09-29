-- CreateEnum
CREATE TYPE "PushNotificationKind" AS ENUM ('CHAT', 'EMERGENCY', 'SUPPORT', 'ANNOUNCEMENT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "PushNotificationStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "PushNotificationLog" ADD COLUMN     "kind" "PushNotificationKind";

-- CreateIndex
CREATE INDEX "PushNotificationLog_kind_sentAt_idx" ON "PushNotificationLog"("kind", "sentAt");
