-- A reply's parent key includes the chat, so a reply can only answer a message of its own chat.
-- Before, a reply in chat A could name a message of chat B as its parent: members of B saw it in
-- that thread, and deleting B deleted the reply in A with it.

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_parentId_fkey";

-- A reply that already answers a message of another chat could not be stored under the new key.
-- It stays in its own chat as a message of its own, so nothing is lost.
UPDATE "Message" AS "reply"
SET "parentId" = NULL
FROM "Message" AS "parent"
WHERE "parent"."uuid" = "reply"."parentId"
  AND "parent"."chatId" <> "reply"."chatId";

-- CreateIndex
CREATE UNIQUE INDEX "Message_uuid_chatId_key" ON "Message"("uuid", "chatId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_chatId_fkey" FOREIGN KEY ("parentId", "chatId") REFERENCES "Message"("uuid", "chatId") ON DELETE CASCADE ON UPDATE CASCADE;
