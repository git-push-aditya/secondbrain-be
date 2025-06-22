/*
  Warnings:

  - You are about to drop the column `assignedAt` on the `ContentTags` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[collectionId]` on the table `link` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `collectionId` to the `link` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "link_userId_idx";

-- DropIndex
DROP INDEX "link_userId_key";

-- AlterTable
ALTER TABLE "ContentTags" DROP COLUMN "assignedAt";

-- AlterTable
ALTER TABLE "link" ADD COLUMN     "collectionId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "collection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Dashboard',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contentCollection" (
    "collectionId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,

    CONSTRAINT "contentCollection_pkey" PRIMARY KEY ("contentId","collectionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "link_collectionId_key" ON "link"("collectionId");

-- CreateIndex
CREATE INDEX "link_userId_collectionId_hash_idx" ON "link"("userId", "collectionId", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contentCollection" ADD CONSTRAINT "contentCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contentCollection" ADD CONSTRAINT "contentCollection_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link" ADD CONSTRAINT "link_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
