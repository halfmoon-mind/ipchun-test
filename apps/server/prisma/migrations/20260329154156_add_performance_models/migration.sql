/*
  Warnings:

  - You are about to drop the column `followers` on the `artists` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('CONCERT', 'MUSICAL', 'PLAY', 'CLASSIC', 'FESTIVAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('SCHEDULED', 'ON_SALE', 'SOLD_OUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPlatform" AS ENUM ('MELON', 'NOL', 'TICKETLINK');

-- AlterTable
ALTER TABLE "artists" DROP COLUMN "followers";

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performances" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "genre" "Genre" NOT NULL DEFAULT 'CONCERT',
    "age_rating" TEXT,
    "runtime" INTEGER,
    "intermission" INTEGER,
    "poster_url" TEXT,
    "status" "PerformanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "venue_id" TEXT,
    "organizer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_sources" (
    "id" TEXT NOT NULL,
    "performance_id" TEXT NOT NULL,
    "platform" "TicketPlatform" NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "ticket_open_at" TIMESTAMP(3),
    "booking_end_at" TIMESTAMP(3),
    "sales_status" TEXT,
    "raw_data" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_schedules" (
    "id" TEXT NOT NULL,
    "performance_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_artists" (
    "id" TEXT NOT NULL,
    "performance_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "seat_grade" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

-- CreateIndex
CREATE UNIQUE INDEX "performance_sources_platform_external_id_key" ON "performance_sources"("platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_schedules_performance_id_date_time_key" ON "performance_schedules"("performance_id", "date_time");

-- CreateIndex
CREATE UNIQUE INDEX "performance_artists_performance_id_artist_id_key" ON "performance_artists"("performance_id", "artist_id");

-- AddForeignKey
ALTER TABLE "performances" ADD CONSTRAINT "performances_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_sources" ADD CONSTRAINT "performance_sources_performance_id_fkey" FOREIGN KEY ("performance_id") REFERENCES "performances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_schedules" ADD CONSTRAINT "performance_schedules_performance_id_fkey" FOREIGN KEY ("performance_id") REFERENCES "performances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_artists" ADD CONSTRAINT "performance_artists_performance_id_fkey" FOREIGN KEY ("performance_id") REFERENCES "performances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_artists" ADD CONSTRAINT "performance_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "performance_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
