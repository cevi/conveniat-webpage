-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hofId" TEXT;

-- CreateIndex
CREATE INDEX "Enrollment_hofId_idx" ON "Enrollment"("hofId");

-- Enrolments from before this column carry their time in their id: a UUIDv7 starts with the
-- milliseconds since 1970 in its first 48 bits. Rows whose id is not one keep the migration time.
UPDATE "Enrollment"
SET "createdAt" = to_timestamp(('x' || substr(replace("id", '-', ''), 1, 12))::bit(48)::bigint / 1000.0)
WHERE "id" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-';

-- A shift enrolment of a person in exactly one Hof counts for that Hof; whoever is in several
-- picks one the next time they enrol, and their past enrolments count for none.
UPDATE "Enrollment" AS e
SET "hofId" = u."hofIds"[1]
FROM "User" AS u
WHERE e."userId" = u."uuid"
  AND e."courseType" = 'SHIFT'
  AND cardinality(u."hofIds") = 1;
