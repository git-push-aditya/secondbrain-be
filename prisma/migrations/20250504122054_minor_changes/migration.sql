-- AlterEnum
ALTER TYPE "Type" ADD VALUE 'INSTAGRAM';

-- AlterTable
ALTER TABLE "link" ALTER COLUMN "createdAt" DROP NOT NULL;
