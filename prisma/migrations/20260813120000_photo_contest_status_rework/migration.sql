-- Rework the photo contest lifecycle:
--   DRAFT / UPLOADING -> HIDDEN         (not visible in the app)
--   VOTING            -> ACTIVE         (open for voting)
--   CLOSED            -> CLOSED         (photos and results visible)
-- and introduce CLOSED_HIDDEN (photos visible, no voting, no results).

-- AlterEnum
ALTER TYPE "PhotoContestStatus" RENAME TO "PhotoContestStatus_old";

CREATE TYPE "PhotoContestStatus" AS ENUM ('HIDDEN', 'ACTIVE', 'CLOSED_HIDDEN', 'CLOSED');

ALTER TABLE "PhotoContest" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "PhotoContest"
    ALTER COLUMN "status" TYPE "PhotoContestStatus"
    USING (
        CASE "status"::text
            WHEN 'VOTING' THEN 'ACTIVE'
            WHEN 'CLOSED' THEN 'CLOSED'
            ELSE 'HIDDEN'
        END
    )::"PhotoContestStatus";

ALTER TABLE "PhotoContest" ALTER COLUMN "status" SET DEFAULT 'HIDDEN';

DROP TYPE "PhotoContestStatus_old";

-- DropColumn: only the preselected contest type is supported from now on
ALTER TABLE "PhotoContest" DROP COLUMN "contestType";

-- DropEnum
DROP TYPE "PhotoContestType";
