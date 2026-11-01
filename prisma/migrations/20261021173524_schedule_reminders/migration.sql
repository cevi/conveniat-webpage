-- CreateEnum
CREATE TYPE "ScheduleReminderDeliveryKind" AS ENUM ('LEAD', 'START');

-- AlterEnum
ALTER TYPE "PushNotificationKind" ADD VALUE 'REMINDER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderAtStart" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderLeadMinutes" INTEGER DEFAULT 15,
ADD COLUMN     "reminderLocale" TEXT;

-- CreateTable
CREATE TABLE "ScheduleReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "entryType" "CourseType" NOT NULL DEFAULT 'PROGRAM',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleReminderDelivery" (
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "kind" "ScheduleReminderDeliveryKind" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleReminderDelivery_pkey" PRIMARY KEY ("userId","entryId","kind","scheduledFor")
);

-- CreateIndex
CREATE INDEX "ScheduleReminder_entryId_idx" ON "ScheduleReminder"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleReminder_userId_entryId_key" ON "ScheduleReminder"("userId", "entryId");

-- CreateIndex
CREATE INDEX "ScheduleReminderDelivery_sentAt_idx" ON "ScheduleReminderDelivery"("sentAt");

-- AddForeignKey
ALTER TABLE "ScheduleReminder" ADD CONSTRAINT "ScheduleReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleReminderDelivery" ADD CONSTRAINT "ScheduleReminderDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
