-- DropIndex
DROP INDEX "VisitDayRegistration_visitDate_idx";

-- AlterTable
ALTER TABLE "VisitDayRegistration" ADD COLUMN     "withLunch" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "hofId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "VisitDayRegistration_visitDate_withLunch_idx" ON "VisitDayRegistration"("visitDate", "withLunch");
