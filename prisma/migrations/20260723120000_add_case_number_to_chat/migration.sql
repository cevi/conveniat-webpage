-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "caseNumber" TEXT;

-- CreateIndex
CREATE INDEX "Chat_caseNumber_idx" ON "Chat"("caseNumber");
