-- DropForeignKey
ALTER TABLE "contentCollection" DROP CONSTRAINT "contentCollection_contentId_fkey";

-- AddForeignKey
ALTER TABLE "contentCollection" ADD CONSTRAINT "contentCollection_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
