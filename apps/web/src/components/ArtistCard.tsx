import Link from "next/link";
import type { Artist } from "@ipchun/shared";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const imageUrl =
    artist.imageUrl || artist.spotifyMeta?.images?.[0]?.url || null;
  const genres = artist.spotifyMeta?.genres?.slice(0, 2) ?? [];

  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b active:opacity-70 transition-opacity"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Avatar */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={artist.name}
          className="w-11 h-11 object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-11 h-11 flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {artist.name[0]}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold truncate">{artist.name}</h3>
        {genres.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {genres.join(", ")}
          </p>
        )}
      </div>

      {/* Monthly listeners */}
      {artist.monthlyListeners != null && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {artist.monthlyListeners >= 1000
            ? `${(artist.monthlyListeners / 1000).toFixed(0)}K`
            : artist.monthlyListeners.toLocaleString("ko-KR")}
        </span>
      )}
    </Link>
  );
}
