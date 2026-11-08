-- The sender of a chat push and whether its chat is direct, for the Android app that lists a
-- chat's messages under their senders.
ALTER TABLE "PushNotification" ADD COLUMN     "directChat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senderName" TEXT;
