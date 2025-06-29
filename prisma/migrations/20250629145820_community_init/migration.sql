/*
  Warnings:

  - A unique constraint covering the columns `[contentId]` on the table `contentCollection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "votevalue" AS ENUM ('UP', 'DOWN', 'NONE');

-- DropForeignKey
ALTER TABLE "contentCollection" DROP CONSTRAINT "contentCollection_contentId_fkey";

-- CreateTable
CREATE TABLE "community" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "descp" TEXT NOT NULL,
    "membersCanPost" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT NOT NULL,
    "founderId" INTEGER NOT NULL,

    CONSTRAINT "community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communityMembers" (
    "communityId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "communityContent" (
    "contentId" INTEGER NOT NULL,
    "communityId" INTEGER NOT NULL,
    "upVotes" INTEGER NOT NULL DEFAULT 0,
    "downVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "voteLog" (
    "contentId" INTEGER NOT NULL,
    "communityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "vote" "votevalue" NOT NULL DEFAULT 'NONE'
);

-- CreateIndex
CREATE UNIQUE INDEX "community_founderId_name_password_key" ON "community"("founderId", "name", "password");

-- CreateIndex
CREATE UNIQUE INDEX "communityMembers_communityId_memberId_key" ON "communityMembers"("communityId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "communityContent_contentId_key" ON "communityContent"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "communityContent_communityId_contentId_key" ON "communityContent"("communityId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "voteLog_userId_communityId_contentId_key" ON "voteLog"("userId", "communityId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "contentCollection_contentId_key" ON "contentCollection"("contentId");

-- AddForeignKey
ALTER TABLE "contentCollection" ADD CONSTRAINT "contentCollection_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community" ADD CONSTRAINT "community_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communityMembers" ADD CONSTRAINT "communityMembers_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communityMembers" ADD CONSTRAINT "communityMembers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communityContent" ADD CONSTRAINT "communityContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communityContent" ADD CONSTRAINT "communityContent_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteLog" ADD CONSTRAINT "voteLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteLog" ADD CONSTRAINT "voteLog_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voteLog" ADD CONSTRAINT "voteLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
