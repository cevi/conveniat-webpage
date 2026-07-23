-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "caseNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_caseNumber_key" ON "Chat"("caseNumber");
