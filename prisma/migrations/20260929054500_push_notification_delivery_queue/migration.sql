-- AlterTable
ALTER TABLE "PushNotificationLog" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "notificationId" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionId" TEXT;

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" TEXT NOT NULL,
    "kind" "PushNotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "chatId" TEXT,
    "messageId" TEXT,
    "notificationType" TEXT,
    "ignoreIfUrlMatches" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushNotification_messageId_idx" ON "PushNotification"("messageId");

-- CreateIndex
CREATE INDEX "PushNotificationLog_status_priority_nextAttemptAt_idx" ON "PushNotificationLog"("status", "priority", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushNotificationLog_notificationId_subscriptionId_key" ON "PushNotificationLog"("notificationId", "subscriptionId");

-- AddForeignKey
ALTER TABLE "PushNotificationLog" ADD CONSTRAINT "PushNotificationLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "PushNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

