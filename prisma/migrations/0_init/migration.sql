-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('SYSTEM', 'TEXT');

-- CreateEnum
CREATE TYPE "MessageEventType" AS ENUM ('CREATED', 'SERVER_RECEIVED', 'SERVER_SENT', 'USER_RECEIVED', 'USER_READ');

-- CreateTable
CREATE TABLE "User" (
    "uuid" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Chat" (
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ChatMembership" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "ChatMembership_pkey" PRIMARY KEY ("userId","chatId")
);

-- CreateTable
CREATE TABLE "Message" (
    "uuid" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "chatId" TEXT NOT NULL,
    "senderId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MessageEvent" (
    "uuid" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "eventType" "MessageEventType" NOT NULL,
    "userId" TEXT,

    CONSTRAINT "MessageEvent_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageEvent_messageId_userId_eventType_key" ON "MessageEvent"("messageId", "userId", "eventType");

-- AddForeignKey
ALTER TABLE "ChatMembership" ADD CONSTRAINT "ChatMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMembership" ADD CONSTRAINT "ChatMembership_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
