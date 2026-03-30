/*
  Warnings:

  - You are about to drop the column `schedule_lineup_id` on the `user_bookmarks` table. All the data in the column will be lost.
  - You are about to drop the `schedule_lineups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_schedule_attendances` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,performance_artist_id]` on the table `user_bookmarks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `performance_artist_id` to the `user_bookmarks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Genre" ADD VALUE 'BUSKING';
ALTER TYPE "Genre" ADD VALUE 'RELEASE';

-- DropForeignKey
ALTER TABLE "schedule_lineups" DROP CONSTRAINT "schedule_lineups_artist_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_lineups" DROP CONSTRAINT "schedule_lineups_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "user_bookmarks" DROP CONSTRAINT "user_bookmarks_schedule_lineup_id_fkey";

-- DropForeignKey
ALTER TABLE "user_schedule_attendances" DROP CONSTRAINT "user_schedule_attendances_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "user_schedule_attendances" DROP CONSTRAINT "user_schedule_attendances_user_id_fkey";

-- DropIndex
DROP INDEX "user_bookmarks_user_id_schedule_lineup_id_key";

-- AlterTable
ALTER TABLE "performance_artists" ADD COLUMN     "end_time" TIMESTAMP(3),
ADD COLUMN     "performance_order" INTEGER,
ADD COLUMN     "stage_name" TEXT,
ADD COLUMN     "start_time" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "performances" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "user_bookmarks" DROP COLUMN "schedule_lineup_id",
ADD COLUMN     "performance_artist_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "schedule_lineups";

-- DropTable
DROP TABLE "schedules";

-- DropTable
DROP TABLE "user_schedule_attendances";

-- DropEnum
DROP TYPE "ScheduleType";

-- CreateTable
CREATE TABLE "user_attendances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "performance_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_attendances_user_id_performance_id_date_key" ON "user_attendances"("user_id", "performance_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_bookmarks_user_id_performance_artist_id_key" ON "user_bookmarks"("user_id", "performance_artist_id");

-- AddForeignKey
ALTER TABLE "user_attendances" ADD CONSTRAINT "user_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attendances" ADD CONSTRAINT "user_attendances_performance_id_fkey" FOREIGN KEY ("performance_id") REFERENCES "performances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_performance_artist_id_fkey" FOREIGN KEY ("performance_artist_id") REFERENCES "performance_artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
