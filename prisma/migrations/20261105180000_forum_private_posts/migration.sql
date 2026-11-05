-- A private report to the Zentrale is a forum post only its author, the topic's Kernteam and the
-- piket on duty see. It replaces the support chats the map's report used to open.
-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ForumPost_chatId_private_idx" ON "ForumPost"("chatId", "private");

