DROP TABLE IF EXISTS "ChatCapability";
CREATE TYPE "ChatCapability" AS ENUM ('CAN_SEND_MESSAGES', 'PICTURE_UPLOAD', 'THREADS');
ALTER TABLE "Chat" ADD COLUMN "capabilities" "ChatCapability"[];