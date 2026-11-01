-- CreateTable
CREATE TABLE "VisitDayVisitor" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "personNumber" INTEGER NOT NULL,
    "hofId" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitDayVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitDayVisitor_visitDate_idx" ON "VisitDayVisitor"("visitDate");

-- CreateIndex
CREATE INDEX "VisitDayVisitor_hofId_idx" ON "VisitDayVisitor"("hofId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayVisitor_submissionId_personNumber_key" ON "VisitDayVisitor"("submissionId", "personNumber");
