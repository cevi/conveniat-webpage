-- CreateEnum
CREATE TYPE "MaterialLoanStatus" AS ENUM ('RESERVED', 'ISSUED', 'RETURNED', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialCondition" AS ENUM ('OK', 'LIGHT_DAMAGE', 'DAMAGED', 'MISSING');

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "usageNotes" TEXT,
    "returnInstructions" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stück',
    "categoryId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "maxLoanQuantity" INTEGER NOT NULL,
    "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
    "inRepairQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "isConsumable" BOOLEAN NOT NULL DEFAULT false,
    "isReservable" BOOLEAN NOT NULL DEFAULT true,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialLoan" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "hofId" TEXT,
    "personId" TEXT,
    "responsibleName" TEXT NOT NULL,
    "comment" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isConsumption" BOOLEAN NOT NULL DEFAULT false,
    "status" "MaterialLoanStatus" NOT NULL,
    "issuedQuantity" INTEGER,
    "issuedAt" TIMESTAMP(3),
    "returnedQuantity" INTEGER,
    "returnedAt" TIMESTAMP(3),
    "returnCondition" "MaterialCondition",
    "returnNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIncident" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "loanId" TEXT,
    "condition" "MaterialCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "photoKey" TEXT,
    "reportedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_name_key" ON "MaterialCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialItem_code_key" ON "MaterialItem"("code");

-- CreateIndex
CREATE INDEX "MaterialItem_categoryId_idx" ON "MaterialItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialLoan_number_key" ON "MaterialLoan"("number");

-- CreateIndex
CREATE INDEX "MaterialLoan_itemId_status_idx" ON "MaterialLoan"("itemId", "status");

-- CreateIndex
CREATE INDEX "MaterialLoan_hofId_idx" ON "MaterialLoan"("hofId");

-- CreateIndex
CREATE INDEX "MaterialLoan_personId_idx" ON "MaterialLoan"("personId");

-- CreateIndex
CREATE INDEX "MaterialLoan_createdById_idx" ON "MaterialLoan"("createdById");

-- CreateIndex
CREATE INDEX "MaterialLoan_status_endDate_idx" ON "MaterialLoan"("status", "endDate");

-- CreateIndex
CREATE INDEX "MaterialIncident_itemId_idx" ON "MaterialIncident"("itemId");

-- CreateIndex
CREATE INDEX "MaterialIncident_resolvedAt_idx" ON "MaterialIncident"("resolvedAt");

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLoan" ADD CONSTRAINT "MaterialLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLoan" ADD CONSTRAINT "MaterialLoan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLoan" ADD CONSTRAINT "MaterialLoan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIncident" ADD CONSTRAINT "MaterialIncident_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIncident" ADD CONSTRAINT "MaterialIncident_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "MaterialLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIncident" ADD CONSTRAINT "MaterialIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
