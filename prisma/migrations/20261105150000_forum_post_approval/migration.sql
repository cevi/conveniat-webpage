-- Forum posts may wait for a moderator before they are public, while the flag
-- forum_moderation_required is on. Every post so far was public, so it counts as approved when
-- it was written.
-- AlterEnum
ALTER TYPE "ForumAuditAction" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;

-- CreateIndex
CREATE INDEX "ForumPost_chatId_approvedAt_idx" ON "ForumPost"("chatId", "approvedAt");


UPDATE "ForumPost" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
