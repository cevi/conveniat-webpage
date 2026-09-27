-- CreateTable
CREATE TABLE "ChatInvite" (
    "token" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "chatId" TEXT,

    CONSTRAINT "ChatInvite_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "ChatInvite_issuerId_idx" ON "ChatInvite"("issuerId");

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

