'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.artists.list().then(setArtists).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">아티스트</h1>
        <Link href="/artists/new" className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 아티스트 등록
        </Link>
      </div>

      {loading ? (
        <div className="card">
          <p className="empty-state">로딩 중...</p>
        </div>
      ) : artists.length === 0 ? (
        <div className="card">
          <p className="empty-state">등록된 아티스트가 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="card flex items-center gap-4 p-4 hover:bg-[var(--secondary)] transition-colors"
            >
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
                  &#9835;
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{artist.name}</h2>
                {artist.description && (
                  <p className="text-sm text-gray-500 truncate max-w-md">{artist.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {artist.spotifyUrl && (
                  <span
                    role="link"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(artist.spotifyUrl!, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-green-600 hover:text-green-800 text-sm cursor-pointer"
                  >
                    Spotify
                  </span>
                )}
                {artist.socialLinks &&
                  Object.entries(artist.socialLinks)
                    .filter(([key]) => key !== 'spotify')
                    .map(([key, url]) => (
                      <span
                        key={key}
                        role="link"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-gray-600 hover:text-gray-900 text-sm capitalize cursor-pointer"
                      >
                        {key}
                      </span>
                    ))}
                <span
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/artists/${artist.id}/edit`;
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-sm cursor-pointer"
                >
                  수정
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
