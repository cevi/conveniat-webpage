-- CreateTable
CREATE TABLE "HofShiftQuota" (
    "hofId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "slots" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "HofShiftQuota_pkey" PRIMARY KEY ("hofId","day")
);

-- CreateIndex
CREATE INDEX "HofShiftQuota_day_idx" ON "HofShiftQuota"("day");
