-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hofIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
