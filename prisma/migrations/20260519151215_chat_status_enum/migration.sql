/*
  Warnings:

  - The `status` column on the `Chat` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "status",
ADD COLUMN     "status" "ChatStatus" NOT NULL DEFAULT 'OPEN';
