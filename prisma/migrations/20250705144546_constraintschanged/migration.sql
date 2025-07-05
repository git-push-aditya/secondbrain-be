/*
  Warnings:

  - A unique constraint covering the columns `[founderId,hash]` on the table `community` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "community_founderId_name_password_key";

-- CreateIndex
CREATE UNIQUE INDEX "community_founderId_hash_key" ON "community"("founderId", "hash");
