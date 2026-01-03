-- CreateEnum
CREATE TYPE "PushNotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- AlterTable
ALTER TABLE "PushNotificationLog" ADD COLUMN     "error" TEXT,
ADD COLUMN     "status" "PushNotificationStatus" NOT NULL DEFAULT 'PENDING';
