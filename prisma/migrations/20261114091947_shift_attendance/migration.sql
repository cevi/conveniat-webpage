-- CreateEnum
CREATE TYPE "ShiftAttendance" AS ENUM ('PRESENT', 'ABSENT');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "addedOnSite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendance" "ShiftAttendance",
ADD COLUMN     "attendanceAt" TIMESTAMP(3),
ADD COLUMN     "attendanceBy" TEXT;
