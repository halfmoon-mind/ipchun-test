"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ScheduleCard } from "@/components/ScheduleCard";
import type { Artist, Performance } from "@ipchun/shared";

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [upcoming, setUpcoming] = useState<Performance[]>([]);
  const [past, setPast] = useState<Performance[]>([]);
  const [pastCursor, setPastCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    Promise.all([
      api.artist(id),
      api.performances({ artistId: id, period: "upcoming" }),
      api.performances({ artistId: id, period: "past", limit: 5 }),
    ]).then(([artistData, upcomingData, pastData]) => {
      setArtist(artistData);
      setUpcoming(upcomingData.data);
      setPast(pastData.data);
      setPastCursor(pastData.nextCursor);
      setLoading(false);
    });
  }, [id]);

  const loadMorePast = async () => {
    if (!pastCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await api.performances({
      artistId: id,
      period: "past",
      cursor: pastCursor,
      limit: 5,
    });
    setPast((prev) => [...prev, ...res.data]);
    setPastCursor(res.nextCursor);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        아티스트를 찾을 수 없습니다
      </div>
    );
  }

  const spotifyMeta = artist.spotifyMeta;
  const heroImage =
    artist.imageUrl || spotifyMeta?.images?.[0]?.url || null;
  const genres = spotifyMeta?.genres?.slice(0, 3) ?? [];
  const topTracks = spotifyMeta?.topTracks?.slice(0, 5) ?? [];
  const socialEntries = artist.socialLinks
    ? Object.entries(artist.socialLinks)
    : [];

  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* Hero image */}
      {heroImage ? (
        <div className="mb-4 -mx-4">
          <img
            src={heroImage}
            alt={artist.name}
            className="w-full max-h-80 object-cover"
          />
        </div>
      ) : (
        <div
          className="mb-4 -mx-4 h-48 flex items-center justify-center text-4xl font-bold"
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {artist.name[0]}
        </div>
      )}

      {/* Artist name */}
      <h1
        className="text-xl font-bold leading-tight mb-2"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {artist.name}
      </h1>

      {/* Spotify stats */}
      {spotifyMeta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
          {artist.monthlyListeners != null && (
            <span>
              월간 리스너 {artist.monthlyListeners.toLocaleString("ko-KR")}
            </span>
          )}
          {genres.length > 0 && <span>{genres.join(" / ")}</span>}
          {artist.spotifyUrl && (
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Spotify
              <svg
                className="inline ml-0.5"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Social links */}
      {socialEntries.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs font-medium mb-4">
          {socialEntries.map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              {platform}
            </a>
          ))}
        </div>
      )}

      {/* Description */}
      {artist.description && (
        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          {artist.description}
        </p>
      )}

      {/* Top tracks */}
      {topTracks.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            인기 트랙
          </h2>
          <div>
            {topTracks.map((track, i) => (
              <div
                key={`${track.name}-${i}`}
                className="flex items-center gap-3 py-2 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {track.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {track.albumName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming performances */}
      <div className="mb-6">
        <h2
          className="text-sm font-bold mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          다가오는 공연
        </h2>
        {upcoming.length > 0 ? (
          <div
            className="border-t"
            style={{ borderColor: "var(--border)" }}
          >
            {upcoming.map((p) => (
              <ScheduleCard key={p.id} performance={p} selectedDate={null} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            예정된 공연이 없습니다
          </p>
        )}
      </div>

      {/* Past performances */}
      {past.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            지난 공연
          </h2>
          <div
            className="border-t"
            style={{ borderColor: "var(--border)" }}
          >
            {past.map((p) => (
              <ScheduleCard key={p.id} performance={p} selectedDate={null} />
            ))}
          </div>
          {pastCursor && (
            <button
              onClick={loadMorePast}
              disabled={loadingMore}
              className="w-full py-3 mt-2 text-sm font-medium border"
              style={{
                borderColor: "var(--border)",
                background: "var(--secondary)",
              }}
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
