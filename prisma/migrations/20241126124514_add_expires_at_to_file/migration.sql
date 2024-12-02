/*
  Warnings:

  - Added the required column `expiresAt` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fileId" TEXT NOT NULL;
