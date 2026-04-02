import type { Metadata } from "next";
import type { Artist } from "@ipchun/shared";
import { ArtistList } from "@/components/ArtistList";

export const metadata: Metadata = {
  title: "아티스트",
  description: "인디 밴드·아티스트 모음",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default async function ArtistsPage() {
  let artists: Artist[];
  try {
    const res = await fetch(`${API_BASE}/artists`);
    artists = res.ok ? await res.json() : [];
  } catch {
    artists = [];
  }

  return <ArtistList initialArtists={artists} />;
}
