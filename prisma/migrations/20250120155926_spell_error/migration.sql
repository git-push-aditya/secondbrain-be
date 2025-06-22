/*
  Warnings:

  - The primary key for the `ContentTags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `int` on the `ContentTags` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContentTags" DROP CONSTRAINT "ContentTags_pkey",
DROP COLUMN "int",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "ContentTags_pkey" PRIMARY KEY ("id");
