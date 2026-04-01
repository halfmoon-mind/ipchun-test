import type { Metadata } from "next";
import type { Artist, Performance, PaginatedResponse } from "@ipchun/shared";
import ArtistDetail from "./ArtistDetail";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchArtist(id: string): Promise<Artist | null> {
  try {
    const res = await fetch(`${API_BASE}/artists/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchPerformances(
  artistId: string,
  period: "upcoming" | "past",
  limit?: number,
): Promise<PaginatedResponse<Performance>> {
  const sp = new URLSearchParams({ artistId, period });
  if (limit) sp.set("limit", String(limit));
  try {
    const res = await fetch(`${API_BASE}/performances?${sp}`);
    if (!res.ok) return { data: [], nextCursor: null };
    return res.json();
  } catch {
    return { data: [], nextCursor: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artist = await fetchArtist(id);

  if (!artist) return { title: "아티스트 정보" };

  const title = artist.name;
  const description =
    artist.description || `${artist.name} 아티스트 정보 및 공연 일정`;
  const imageUrl =
    artist.imageUrl || artist.spotifyMeta?.images?.[0]?.url || null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    alternates: {
      canonical: `/artists/${id}`,
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;

  const [artist, upcomingData, pastData] = await Promise.all([
    fetchArtist(id),
    fetchPerformances(id, "upcoming"),
    fetchPerformances(id, "past", 5),
  ]);

  if (!artist) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        아티스트를 찾을 수 없습니다
      </div>
    );
  }

  return (
    <ArtistDetail
      artist={artist}
      initialUpcoming={upcomingData.data}
      initialPast={pastData.data}
      initialPastCursor={pastData.nextCursor}
    />
  );
}
