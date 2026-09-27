-- The old unique index included "messageContentId", which is always NULL. Postgres treats NULLs as
-- distinct, so it never rejected anything and every markChatAsRead added another READ row. Keep the
-- oldest event (UUIDv7 sorts by time) per message, user and type before the real index goes on.
DELETE FROM "MessageEvent"
WHERE "uuid" IN (
  SELECT "uuid"
  FROM (
    SELECT "uuid",
      ROW_NUMBER() OVER (PARTITION BY "messageId", "userId", "type" ORDER BY "uuid") AS "rank"
    FROM "MessageEvent"
    WHERE "userId" IS NOT NULL
  ) AS "ranked"
  WHERE "rank" > 1
);

-- DropIndex
DROP INDEX "MessageEvent_messageId_userId_type_messageContentId_key";

-- CreateIndex
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageEvent_messageId_userId_type_key" ON "MessageEvent"("messageId", "userId", "type");
