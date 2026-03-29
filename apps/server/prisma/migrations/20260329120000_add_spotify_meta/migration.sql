-- AlterTable
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "monthly_listeners" INTEGER,
ADD COLUMN IF NOT EXISTS "spotify_meta" JSONB;
