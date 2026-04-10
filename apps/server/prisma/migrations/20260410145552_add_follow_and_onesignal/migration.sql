-- AlterTable
ALTER TABLE "users" ADD COLUMN     "one_signal_player_id" TEXT;

-- CreateTable
CREATE TABLE "user_follow_artists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follow_artists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_artists_user_id_artist_id_key" ON "user_follow_artists"("user_id", "artist_id");

-- AddForeignKey
ALTER TABLE "user_follow_artists" ADD CONSTRAINT "user_follow_artists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow_artists" ADD CONSTRAINT "user_follow_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
