/*
  Warnings:

  - You are about to drop the column `gender` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "profilePic" AS ENUM ('b1', 'b2', 'b3', 'g1', 'g2', 'g3');

-- AlterTable
ALTER TABLE "user" DROP COLUMN "gender",
ADD COLUMN     "profilePic" "profilePic" NOT NULL DEFAULT 'b1';

-- DropEnum
DROP TYPE "gender";
