/*
  Warnings:

  - The values [UP,DOWN] on the enum `votevalue` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "votevalue_new" AS ENUM ('upVote', 'downVote', 'NONE');
ALTER TABLE "voteLog" ALTER COLUMN "vote" DROP DEFAULT;
ALTER TABLE "voteLog" ALTER COLUMN "vote" TYPE "votevalue_new" USING ("vote"::text::"votevalue_new");
ALTER TYPE "votevalue" RENAME TO "votevalue_old";
ALTER TYPE "votevalue_new" RENAME TO "votevalue";
DROP TYPE "votevalue_old";
ALTER TABLE "voteLog" ALTER COLUMN "vote" SET DEFAULT 'NONE';
COMMIT;
