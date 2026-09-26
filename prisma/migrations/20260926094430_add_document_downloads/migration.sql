-- CreateTable
CREATE TABLE "DocumentDownload" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentDownload_documentId_idx" ON "DocumentDownload"("documentId");
