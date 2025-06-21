/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `collection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "content_hyperlink_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "collection_name_userId_key" ON "collection"("name", "userId");
