-- CreateEnum
CREATE TYPE "Type" AS ENUM ('TWITTER', 'YOUTUBE', 'GITHUB', 'REDDIT', 'WEB');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "userName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "hyperlink" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "type" "Type" NOT NULL DEFAULT 'WEB',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "contentId" INTEGER NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_userName_key" ON "user"("userName");

-- CreateIndex
CREATE INDEX "content_userId_idx" ON "content"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_hyperlink_userId_key" ON "content"("hyperlink", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "link_hash_key" ON "link"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "link_userId_key" ON "link"("userId");

-- CreateIndex
CREATE INDEX "link_userId_idx" ON "link"("userId");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link" ADD CONSTRAINT "link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
