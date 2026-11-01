-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "markedUnread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mutedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedAt" TIMESTAMP(3);
