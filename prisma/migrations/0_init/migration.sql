-- CreateEnum
CREATE TYPE "public"."ChatType" AS ENUM ('ONE_TO_ONE', 'GROUP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."ChatMembershipPermission" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('SYSTEM_MSG', 'TEXT_MSG', 'LOCATION_MSG', 'IMAGE_MSG');

-- CreateEnum
CREATE TYPE "public"."MessageEventType" AS ENUM ('CREATED', 'STORED', 'DISTRIBUTED', 'RECEIVED', 'READ');

-- CreateTable
CREATE TABLE "public"."User" (
    "uuid" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "public"."Chat" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "type" "public"."ChatType" NOT NULL DEFAULT 'GROUP',

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "public"."ChatMembership" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "hasDeleted" BOOLEAN NOT NULL DEFAULT false,
    "chatPermission" "public"."ChatMembershipPermission" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "ChatMembership_pkey" PRIMARY KEY ("userId","chatId")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "uuid" TEXT NOT NULL,
    "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT_MSG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "public"."MessageContent" (
    "uuid" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "messageId" TEXT,

    CONSTRAINT "MessageContent_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "public"."MessageEvent" (
    "uuid" TEXT NOT NULL,
    "type" "public"."MessageEventType" NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT,
    "messageContentId" TEXT,

    CONSTRAINT "MessageEvent_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "Chat_lastUpdate_idx" ON "public"."Chat"("lastUpdate");

-- CreateIndex
CREATE INDEX "ChatMembership_userId_idx" ON "public"."ChatMembership"("userId");

-- CreateIndex
CREATE INDEX "ChatMembership_chatId_idx" ON "public"."ChatMembership"("chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "public"."Message"("chatId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MessageContent_messageId_revision_idx" ON "public"."MessageContent"("messageId", "revision" DESC);

-- CreateIndex
CREATE INDEX "MessageEvent_messageId_idx" ON "public"."MessageEvent"("messageId");

-- CreateIndex
CREATE INDEX "MessageEvent_userId_idx" ON "public"."MessageEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageEvent_messageId_userId_type_messageContentId_key" ON "public"."MessageEvent"("messageId", "userId", "type", "messageContentId");

-- AddForeignKey
ALTER TABLE "public"."ChatMembership" ADD CONSTRAINT "ChatMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMembership" ADD CONSTRAINT "ChatMembership_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageContent" ADD CONSTRAINT "MessageContent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageEvent" ADD CONSTRAINT "MessageEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageEvent" ADD CONSTRAINT "MessageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageEvent" ADD CONSTRAINT "MessageEvent_messageContentId_fkey" FOREIGN KEY ("messageContentId") REFERENCES "public"."MessageContent"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
