/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `AuthToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AuthToken" DROP COLUMN "expiresAt";
