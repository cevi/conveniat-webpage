-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'SUPPORT_GROUP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'ALERT_QUESTION';
ALTER TYPE "MessageType" ADD VALUE 'ALERT_RESPONSE';

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "ChatCapability" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChatCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatCapability_chatId_idx" ON "ChatCapability"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatCapability_chatId_capability_key" ON "ChatCapability"("chatId", "capability");

-- AddForeignKey
ALTER TABLE "ChatCapability" ADD CONSTRAINT "ChatCapability_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
