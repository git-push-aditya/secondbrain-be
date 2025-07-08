/*
  Warnings:

  - Added the required column `emailLead` to the `community` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "community" ADD COLUMN     "emailLead" TEXT NOT NULL;
