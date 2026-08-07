-- Denormalize the content<->collection relationship: contentCollection was a 1:1
-- "join table" in practice (contentId was already unique on it), so this folds it
-- directly onto content and adds a real (collectionId, hyperlink) unique constraint
-- to enforce "no duplicate link in the same collection" atomically at the DB level.

-- 1. Add the new nullable column (nullable because community-only content has no collection)
ALTER TABLE "content" ADD COLUMN "collectionId" INTEGER;

-- 2. Backfill from the existing join table
UPDATE "content" c
SET "collectionId" = cc."collectionId"
FROM "contentCollection" cc
WHERE cc."contentId" = c."id";

-- 3. Foreign key, matching the cascade behavior contentCollection.collectionId had
ALTER TABLE "content" ADD CONSTRAINT "content_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. The constraint this migration exists for: NULLs never conflict with each other
-- in a Postgres unique index, so community content (collectionId IS NULL) is unaffected
CREATE UNIQUE INDEX "content_collectionId_hyperlink_key" ON "content"("collectionId", "hyperlink");

-- 5. The join table is now redundant
DROP TABLE "contentCollection";
