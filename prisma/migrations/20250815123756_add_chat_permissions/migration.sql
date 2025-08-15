-- CreateEnum
CREATE TYPE "public"."ChatMembershipPermission" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- DropForeignKey
ALTER TABLE "public"."ChatMembership" DROP CONSTRAINT "ChatMembership_chatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_chatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MessageEvent" DROP CONSTRAINT "MessageEvent_messageId_fkey";

-- AlterTable
ALTER TABLE "public"."Chat" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."ChatMembership" ADD COLUMN     "chatPermission" "public"."ChatMembershipPermission" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "hasDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "public"."ChatMembership" ADD CONSTRAINT "ChatMembership_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageEvent" ADD CONSTRAINT "MessageEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
