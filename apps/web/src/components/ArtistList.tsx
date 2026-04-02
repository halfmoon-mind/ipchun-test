"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { ArtistCard } from "@/components/ArtistCard";
import { api } from "@/lib/api";
import type { Artist } from "@ipchun/shared";

interface ArtistListProps {
  initialArtists: Artist[];
}

export function ArtistList({ initialArtists }: ArtistListProps) {
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState(initialArtists);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!query) {
      setArtists(initialArtists);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await api.artists(query);
        setArtists(results);
      });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, initialArtists]);

  return (
    <div>
      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="아티스트 검색"
            className="w-full py-2 pl-9 pr-3 text-sm border"
            style={{
              borderColor: "var(--input)",
              background: "var(--background)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Count */}
      <div className="px-4 pb-2">
        <span className="text-xs text-muted-foreground">
          {isPending ? "검색 중..." : `${artists.length}명의 아티스트`}
        </span>
      </div>

      {/* List */}
      {artists.length > 0 ? (
        <div
          className="border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {query ? "검색 결과가 없습니다" : "등록된 아티스트가 없습니다"}
        </div>
      )}
    </div>
  );
}
