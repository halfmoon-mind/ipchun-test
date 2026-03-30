-- CreateEnum
CREATE TYPE "LineupMode" AS ENUM ('LINEUP', 'TIMETABLE');

-- AlterTable
ALTER TABLE "performance_artists" ADD COLUMN     "performance_schedule_id" TEXT,
ADD COLUMN     "stage" TEXT;

-- AlterTable
ALTER TABLE "performances" ADD COLUMN     "lineup_mode" "LineupMode";

-- AddForeignKey
ALTER TABLE "performance_artists" ADD CONSTRAINT "performance_artists_performance_schedule_id_fkey" FOREIGN KEY ("performance_schedule_id") REFERENCES "performance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
