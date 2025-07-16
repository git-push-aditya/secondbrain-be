-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "gender" "gender" NOT NULL DEFAULT 'male';
