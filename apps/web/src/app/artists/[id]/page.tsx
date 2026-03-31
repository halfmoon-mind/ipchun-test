import type { Metadata } from "next";
import ArtistDetail from "./ArtistDetail";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/artists/${id}`);
    if (!res.ok) return { title: "아티스트 정보" };

    const artist = await res.json();
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
  } catch {
    return { title: "아티스트 정보" };
  }
}

export default function ArtistPage() {
  return <ArtistDetail />;
}
