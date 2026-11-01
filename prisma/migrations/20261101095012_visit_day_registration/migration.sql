-- CreateTable
CREATE TABLE "VisitDayRegistration" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "hofId" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "submissionId" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitDayRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitDayVisitor" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "personNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitDayVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayRegistration_number_key" ON "VisitDayRegistration"("number");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayRegistration_submissionId_key" ON "VisitDayRegistration"("submissionId");

-- CreateIndex
CREATE INDEX "VisitDayRegistration_visitDate_idx" ON "VisitDayRegistration"("visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayRegistration_hofId_counter_key" ON "VisitDayRegistration"("hofId", "counter");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDayVisitor_registrationId_personNumber_key" ON "VisitDayVisitor"("registrationId", "personNumber");

-- AddForeignKey
ALTER TABLE "VisitDayVisitor" ADD CONSTRAINT "VisitDayVisitor_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "VisitDayRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
