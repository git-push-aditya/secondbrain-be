-- DropForeignKey
ALTER TABLE "link" DROP CONSTRAINT "link_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "link" DROP CONSTRAINT "link_userId_fkey";

-- AddForeignKey
ALTER TABLE "link" ADD CONSTRAINT "link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link" ADD CONSTRAINT "link_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
