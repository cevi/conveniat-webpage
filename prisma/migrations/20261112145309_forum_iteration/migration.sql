-- The forum's second version: private reports become private conversations with a topic's
-- Kernteam (chat type FORUM_CONVERSATION), posts get a kind, participants flag, and moderators
-- hide or delete with a reason.
-- CreateEnum
CREATE TYPE "ForumPostKind" AS ENUM ('QUESTION', 'PROBLEM', 'IDEA');

-- CreateEnum
CREATE TYPE "ForumFlagReason" AS ENUM ('INAPPROPRIATE', 'PERSONAL_DATA', 'DUPLICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ForumRemovalKind" AS ENUM ('HIDDEN', 'DELETED');

-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'FORUM_CONVERSATION';

-- AlterEnum
ALTER TYPE "ForumActorCapacity" ADD VALUE 'AUTOMATIC';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ForumAuditAction" ADD VALUE 'HIDDEN';
ALTER TYPE "ForumAuditAction" ADD VALUE 'RESTORED';
ALTER TYPE "ForumAuditAction" ADD VALUE 'FLAGS_DISMISSED';
ALTER TYPE "ForumAuditAction" ADD VALUE 'KIND_CHANGED';

-- Private reports are replaced by conversations. There are none worth keeping, so they go with
-- their comments; the protocol keeps its own copies.
DELETE FROM "Message" WHERE "uuid" IN (SELECT "messageId" FROM "ForumPost" WHERE "private");

-- DropIndex
DROP INDEX "ForumPost_chatId_private_idx";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "forumTopicId" TEXT;

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "forumConversationPushOff" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ForumPost" DROP COLUMN "private",
ADD COLUMN     "kind" "ForumPostKind" NOT NULL DEFAULT 'PROBLEM';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ForumFlag" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "ForumFlagReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ForumFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumRemoval" (
    "messageId" TEXT NOT NULL,
    "kind" "ForumRemovalKind" NOT NULL,
    "reason" "ForumFlagReason" NOT NULL,
    "note" TEXT,
    "removedById" TEXT,
    "removedByName" TEXT,
    "capacity" "ForumActorCapacity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewRequestedAt" TIMESTAMP(3),

    CONSTRAINT "ForumRemoval_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "ForumFlag_resolvedAt_idx" ON "ForumFlag"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForumFlag_messageId_userId_key" ON "ForumFlag"("messageId", "userId");

-- CreateIndex
CREATE INDEX "ForumRemoval_kind_reviewRequestedAt_idx" ON "ForumRemoval"("kind", "reviewRequestedAt");

-- CreateIndex
CREATE INDEX "Chat_forumTopicId_idx" ON "Chat"("forumTopicId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_forumTopicId_fkey" FOREIGN KEY ("forumTopicId") REFERENCES "Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumFlag" ADD CONSTRAINT "ForumFlag_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumRemoval" ADD CONSTRAINT "ForumRemoval_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
