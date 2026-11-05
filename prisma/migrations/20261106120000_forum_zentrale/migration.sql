-- The Zentrale of the forum: what an assignment is, the first reaction a post got, and the
-- protocol entries and capacity the Zentrale adds.
CREATE TYPE "ForumAssignmentKind" AS ENUM ('HELPER', 'CLAIM');
ALTER TYPE "ForumAuditAction" ADD VALUE 'MOVED';
ALTER TYPE "ForumActorCapacity" ADD VALUE 'ZENTRALE';

ALTER TABLE "ForumPostAssignment"
  ADD COLUMN "kind" "ForumAssignmentKind" NOT NULL DEFAULT 'HELPER',
  ADD COLUMN "funktionId" TEXT;

ALTER TABLE "ForumPost" ADD COLUMN "reactedAt" TIMESTAMP(3);

-- a post whose status changed, or that its topic's Kernteam commented on, had its reaction
UPDATE "ForumPost" AS post
SET "reactedAt" = LEAST(
  post."statusChangedAt",
  (
    SELECT min(comment."createdAt")
    FROM "Message" AS comment
    JOIN "ChatMembership" AS membership
      ON membership."chatId" = comment."chatId"
     AND membership."userId" = comment."senderId"
     AND membership."chatPermission" IN ('OWNER', 'ADMIN')
    WHERE comment."parentId" = post."messageId" AND comment."deletedAt" IS NULL
  )
);

CREATE INDEX "ForumPost_chatId_reactedAt_idx" ON "ForumPost"("chatId", "reactedAt");
