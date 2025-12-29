/*
  Warnings:

  - A unique constraint covering the columns `[courseId]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'COURSE_GROUP';

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "courseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_courseId_key" ON "Chat"("courseId");
