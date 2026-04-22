/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "questions" DROP COLUMN "deletedAt",
ADD COLUMN     "imageUrl" TEXT;
