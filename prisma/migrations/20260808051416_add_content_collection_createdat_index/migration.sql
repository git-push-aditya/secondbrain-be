-- CreateIndex
CREATE INDEX "content_collectionId_createdAt_idx" ON "content"("collectionId", "createdAt" DESC);
