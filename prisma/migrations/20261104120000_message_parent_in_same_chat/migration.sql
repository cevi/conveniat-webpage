-- A reply's parent key includes the chat, so a reply can only answer a message of its own chat.
-- Before, a reply in chat A could name a message of chat B as its parent: members of B saw it in
-- that thread, and deleting B deleted the reply in A with it.

-- Our client never sent such a reply, so one can only come from a forged call. It is deleted
-- rather than kept as a message of its own chat, where it would surface out of context and
-- unread. This runs while the old key still cascades, so replies to it go with it, and so do
-- its contents, events and reactions.
DELETE FROM "Message" AS "reply"
USING "Message" AS "parent"
WHERE "parent"."uuid" = "reply"."parentId"
  AND "parent"."chatId" <> "reply"."chatId";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_parentId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Message_uuid_chatId_key" ON "Message"("uuid", "chatId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_chatId_fkey" FOREIGN KEY ("parentId", "chatId") REFERENCES "Message"("uuid", "chatId") ON DELETE CASCADE ON UPDATE CASCADE;
