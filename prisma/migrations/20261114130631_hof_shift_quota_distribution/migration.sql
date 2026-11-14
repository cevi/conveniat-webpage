-- AlterTable
ALTER TABLE "HofShiftQuota" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HofShiftQuotaSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "coveragePercent" INTEGER NOT NULL DEFAULT 100,
    "weightingPercent" INTEGER NOT NULL DEFAULT 80,
    "maxPerDayPercent" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "HofShiftQuotaSettings_pkey" PRIMARY KEY ("id")
);
