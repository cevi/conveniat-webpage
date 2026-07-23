-- AlterTable
ALTER TABLE "User" ADD COLUMN     "presentAtCamp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PresenceLog" (
    "uuid" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresenceLog_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "PresenceLog_userUuid_idx" ON "PresenceLog"("userUuid");

-- CreateIndex
CREATE INDEX "PresenceLog_timestamp_idx" ON "PresenceLog"("timestamp");

-- AddForeignKey
ALTER TABLE "PresenceLog" ADD CONSTRAINT "PresenceLog_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
