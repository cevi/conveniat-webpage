-- CreateEnum
CREATE TYPE "PushNotificationChannel" AS ENUM ('WEB_PUSH', 'NATIVE_FCM');

-- AlterTable
ALTER TABLE "PushNotificationLog" ADD COLUMN     "channel" "PushNotificationChannel" NOT NULL DEFAULT 'WEB_PUSH';
