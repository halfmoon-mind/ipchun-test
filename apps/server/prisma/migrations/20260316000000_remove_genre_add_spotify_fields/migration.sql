-- AlterTable
ALTER TABLE "artists" DROP COLUMN "genre",
ADD COLUMN     "followers" INTEGER,
ADD COLUMN     "monthly_listeners" INTEGER,
ADD COLUMN     "spotify_id" TEXT,
ADD COLUMN     "spotify_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "artists_spotify_id_key" ON "artists"("spotify_id");
