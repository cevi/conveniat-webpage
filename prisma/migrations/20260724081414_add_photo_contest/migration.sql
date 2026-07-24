-- CreateEnum
CREATE TYPE "PhotoContestStatus" AS ENUM ('DRAFT', 'UPLOADING', 'VOTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "PhotoContestType" AS ENUM ('PRESELECTED', 'LIVE_EVENT');

-- CreateTable
CREATE TABLE "PhotoContest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contestType" "PhotoContestType" NOT NULL DEFAULT 'PRESELECTED',
    "status" "PhotoContestStatus" NOT NULL DEFAULT 'DRAFT',
    "votingStart" TIMESTAMP(3),
    "votingEnd" TIMESTAMP(3),
    "maxPointsPerUser" INTEGER NOT NULL DEFAULT 2,
    "maxPointsPerImage" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoContest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoContestImage" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "uploadedById" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoContestImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoContestVote" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoContestVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoContest_slug_key" ON "PhotoContest"("slug");

-- CreateIndex
CREATE INDEX "PhotoContest_status_idx" ON "PhotoContest"("status");

-- CreateIndex
CREATE INDEX "PhotoContest_slug_idx" ON "PhotoContest"("slug");

-- CreateIndex
CREATE INDEX "PhotoContestImage_contestId_idx" ON "PhotoContestImage"("contestId");

-- CreateIndex
CREATE INDEX "PhotoContestImage_uploadedById_idx" ON "PhotoContestImage"("uploadedById");

-- CreateIndex
CREATE INDEX "PhotoContestVote_contestId_userId_idx" ON "PhotoContestVote"("contestId", "userId");

-- CreateIndex
CREATE INDEX "PhotoContestVote_imageId_idx" ON "PhotoContestVote"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoContestVote_contestId_userId_imageId_key" ON "PhotoContestVote"("contestId", "userId", "imageId");

-- AddForeignKey
ALTER TABLE "PhotoContestImage" ADD CONSTRAINT "PhotoContestImage_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "PhotoContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoContestImage" ADD CONSTRAINT "PhotoContestImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoContestVote" ADD CONSTRAINT "PhotoContestVote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "PhotoContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoContestVote" ADD CONSTRAINT "PhotoContestVote_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PhotoContestImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoContestVote" ADD CONSTRAINT "PhotoContestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
