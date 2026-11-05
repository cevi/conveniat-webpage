-- The forum: a topic is a chat of type FORUM, a post a top-level message with a ForumPost row,
-- its thread the comments. Subscriptions decide who gets a push, assignments hand a post to a
-- helper, and ForumAuditEvent records every change someone made to a post they did not write.
-- CreateEnum
CREATE TYPE "ForumPostStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ForumAuditAction" AS ENUM ('STATUS_CHANGED', 'PINNED', 'UNPINNED', 'ANSWER_MARKED', 'ANSWER_UNMARKED', 'MERGED', 'UNMERGED', 'DELETED', 'ASSIGNED', 'ASSIGNMENT_ENDED');

-- CreateEnum
CREATE TYPE "ForumActorCapacity" AS ENUM ('TOPIC_ADMIN', 'PIKET', 'DELEGATE');

-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'FORUM';

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "subscribedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ForumPost" (
    "messageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ForumPostStatus" NOT NULL DEFAULT 'OPEN',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedById" TEXT,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "annotationId" TEXT,
    "pinnedAt" TIMESTAMP(3),
    "answerMessageId" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "ForumPostAssignment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "note" TEXT,
    "addedMembership" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,

    CONSTRAINT "ForumPostAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadSubscription" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadSubscription_pkey" PRIMARY KEY ("userId","messageId")
);

-- CreateTable
CREATE TABLE "ForumAuditEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "ForumAuditAction" NOT NULL,
    "chatId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "postTitle" TEXT NOT NULL,
    "commentId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "capacity" "ForumActorCapacity" NOT NULL,
    "piketScheduleId" TEXT,
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "assignmentId" TEXT,
    "delegatedById" TEXT,
    "delegatedByName" TEXT,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,

    CONSTRAINT "ForumAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumPost_chatId_createdAt_idx" ON "ForumPost"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_status_idx" ON "ForumPost"("status");

-- CreateIndex
CREATE INDEX "ForumPost_annotationId_idx" ON "ForumPost"("annotationId");

-- CreateIndex
CREATE INDEX "ForumPost_latitude_longitude_idx" ON "ForumPost"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ForumPost_mergedIntoId_idx" ON "ForumPost"("mergedIntoId");

-- CreateIndex
CREATE INDEX "ForumPostAssignment_messageId_endedAt_idx" ON "ForumPostAssignment"("messageId", "endedAt");

-- CreateIndex
CREATE INDEX "ForumPostAssignment_assigneeId_endedAt_idx" ON "ForumPostAssignment"("assigneeId", "endedAt");

-- CreateIndex
CREATE INDEX "ThreadSubscription_messageId_idx" ON "ThreadSubscription"("messageId");

-- CreateIndex
CREATE INDEX "ForumAuditEvent_createdAt_idx" ON "ForumAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ForumAuditEvent_chatId_createdAt_idx" ON "ForumAuditEvent"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumAuditEvent_actorId_createdAt_idx" ON "ForumAuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumAuditEvent_messageId_createdAt_idx" ON "ForumAuditEvent"("messageId", "createdAt");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostAssignment" ADD CONSTRAINT "ForumPostAssignment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ForumPost"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostAssignment" ADD CONSTRAINT "ForumPostAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostAssignment" ADD CONSTRAINT "ForumPostAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadSubscription" ADD CONSTRAINT "ThreadSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadSubscription" ADD CONSTRAINT "ThreadSubscription_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;


-- The protocol is append only: an undone change is a new entry, never an edited one. Refused in
-- the database, so neither a bug nor a manual query rewrites it. The one exception is merging two
-- people, which moves their entries to the person that stays: inside a transaction that set
-- `forum_audit.reassign_people`, an update may change who acted and who delegated, and nothing
-- else, see `merge-users-data`.
CREATE FUNCTION "forum_audit_event_append_only"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('forum_audit.reassign_people', true) = 'on'
     AND (to_jsonb(NEW) - 'actorId' - 'delegatedById') = (to_jsonb(OLD) - 'actorId' - 'delegatedById') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'ForumAuditEvent is append only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ForumAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "ForumAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "forum_audit_event_append_only"();
