-- Every message gets its position in its chat, and read markers become positions instead of
-- message ids compared by createdAt. A timestamp is taken before the commit and can be set by
-- the caller (an announcement published again after a failed attempt kept its first
-- publishedAt), so a message could land behind a read marker without anyone having seen it.

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "lastMessageSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN "lastReadSeq" INTEGER;

-- AlterTable
-- Takes an exclusive lock on "Message" until this migration commits, so no message is inserted
-- between the numbering below and the trigger.
ALTER TABLE "Message" ADD COLUMN "seq" INTEGER;

-- Number the existing messages of each chat in the order they were shown so far.
UPDATE "Message" AS "message"
SET "seq" = "numbered"."seq"
FROM (
  SELECT "uuid", ROW_NUMBER() OVER (PARTITION BY "chatId" ORDER BY "createdAt", "uuid") AS "seq"
  FROM "Message"
) AS "numbered"
WHERE "numbered"."uuid" = "message"."uuid";

ALTER TABLE "Message" ALTER COLUMN "seq" SET NOT NULL;

UPDATE "Chat" AS "chat"
SET "lastMessageSeq" = "last"."seq"
FROM (SELECT "chatId", MAX("seq") AS "seq" FROM "Message" GROUP BY "chatId") AS "last"
WHERE "last"."chatId" = "chat"."uuid";

-- A marker on a message that no longer exists stays null, which is how it was read before.
UPDATE "ChatMembership" AS "membership"
SET "lastReadSeq" = "message"."seq"
FROM "Message" AS "message"
WHERE "message"."uuid" = "membership"."lastReadMessageId"
  AND "message"."chatId" = "membership"."chatId";

-- Hands out the next position of the chat. The UPDATE keeps the chat row locked until the
-- inserting transaction commits, so the next message of the same chat waits for it, and a
-- lower position is always visible before a higher one. Every insert gets its position here,
-- whatever code path it comes from, and a position passed in by the caller is overwritten.
CREATE FUNCTION "assign_message_seq"() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Chat"
  SET "lastMessageSeq" = "lastMessageSeq" + 1
  WHERE "uuid" = NEW."chatId"
  RETURNING "lastMessageSeq" INTO NEW."seq";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_assign_seq"
BEFORE INSERT ON "Message"
FOR EACH ROW EXECUTE FUNCTION "assign_message_seq"();

-- DropIndex
-- covered by the new index, which starts with "chatId"
DROP INDEX "ChatMembership_chatId_idx";

-- CreateIndex
CREATE INDEX "ChatMembership_chatId_lastReadSeq_idx" ON "ChatMembership"("chatId", "lastReadSeq");

-- CreateIndex
CREATE UNIQUE INDEX "Message_chatId_seq_key" ON "Message"("chatId", "seq");
