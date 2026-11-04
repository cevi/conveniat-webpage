-- AlterTable
ALTER TABLE "VisitDayRegistration" ADD COLUMN     "billNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayRegistration_billNumber_key" ON "VisitDayRegistration"("billNumber");
