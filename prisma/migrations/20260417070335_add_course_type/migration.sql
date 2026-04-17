-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('PROGRAM', 'SHIFT');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'PROGRAM';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'PROGRAM';

-- AlterTable
ALTER TABLE "Star" ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'PROGRAM';

-- CreateIndex
CREATE INDEX "Enrollment_courseType_idx" ON "Enrollment"("courseType");

-- CreateIndex
CREATE INDEX "Star_courseType_idx" ON "Star"("courseType");
