/*
  Warnings:

  - You are about to drop the column `followers` on the `artists` table. All the data in the column will be lost.
  - You are about to drop the column `monthly_listeners` on the `artists` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artists" DROP COLUMN "followers",
DROP COLUMN "monthly_listeners";
