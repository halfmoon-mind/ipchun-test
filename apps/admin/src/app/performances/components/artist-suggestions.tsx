'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';

interface ArtistMatch {
  name: string;
  dbResults: Artist[];
  spotifyResults: { spotifyId: string; name: string; imageUrl: string | null; followers: number }[];
  loading: boolean;
}

interface ArtistSuggestionsProps {
  artistNames: string[];
  excludeIds: string[];
  onSelect: (artist: Artist) => void;
}

export function ArtistSuggestions({ artistNames, excludeIds, onSelect }: ArtistSuggestionsProps) {
  const [matches, setMatches] = useState<ArtistMatch[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (artistNames.length === 0) {
      setMatches([]);
      return;
    }

    const initial = artistNames.map((name) => ({
      name,
      dbResults: [],
      spotifyResults: [],
      loading: true,
    }));
    setMatches(initial);

    artistNames.forEach(async (name, idx) => {
      try {
        const [db, spotify] = await Promise.all([
          api.artists.list(name),
          api.spotify.search(name),
        ]);
        setMatches((prev) =>
          prev.map((m, i) =>
            i === idx
              ? {
                  ...m,
                  dbResults: db.filter((a) => !excludeIds.includes(a.id)),
                  spotifyResults: spotify.artists,
                  loading: false,
                }
              : m,
          ),
        );
      } catch {
        setMatches((prev) =>
          prev.map((m, i) => (i === idx ? { ...m, loading: false } : m)),
        );
      }
    });
  }, [artistNames.join(',')]);

  async function handleSelectSpotify(
    item: { spotifyId: string; name: string; imageUrl: string | null; followers: number },
    dbResults: Artist[],
  ) {
    const existing = dbResults.find((a) => a.spotifyId === item.spotifyId);
    if (existing) {
      onSelect(existing);
      return;
    }

    setCreating(item.spotifyId);
    try {
      const [detail, youtube] = await Promise.all([
        api.spotify.getArtist(item.spotifyId),
        api.youtube.searchChannel(item.name),
      ]);
      const socialLinks: Record<string, string> = { spotify: detail.spotifyUrl };
      if (youtube?.channelUrl) {
        socialLinks.youtube = youtube.channelUrl;
      }
      const artist = await api.artists.create({
        name: detail.name,
        description: detail.description,
        imageUrl: detail.imageUrl,
        socialLinks,
        spotifyId: detail.spotifyId,
        spotifyUrl: detail.spotifyUrl,
        monthlyListeners: detail.monthlyListeners,
        spotifyMeta: detail.spotifyMeta,
      });
      onSelect(artist);
    } catch (err) {
      alert(err instanceof Error ? err.message : '아티스트 등록 실패');
    } finally {
      setCreating(null);
    }
  }

  if (matches.length === 0) return null;

  return (
    <div style={{
      padding: 16,
      border: '1px solid var(--border)',
      background: 'var(--secondary)',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--foreground)',
      }}>
        추천 아티스트
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
        티켓 페이지에서 추출한 아티스트입니다. 클릭하여 추가하세요.
      </p>

      {matches.map((m) => (
        <div key={m.name} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>
            &ldquo;{m.name}&rdquo; 검색 결과
          </div>

          {m.loading && (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>검색중...</span>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.dbResults.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a)}
                disabled={excludeIds.includes(a.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', fontSize: 13, border: '1px solid var(--border)',
                  background: excludeIds.includes(a.id) ? 'var(--muted)' : '#fff',
                  cursor: excludeIds.includes(a.id) ? 'default' : 'pointer',
                  opacity: excludeIds.includes(a.id) ? 0.5 : 1,
                }}
              >
                {a.imageUrl && (
                  <img src={a.imageUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span>{a.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>DB</span>
              </button>
            ))}

            {m.spotifyResults
              .slice(0, 3)
              .map((s) => (
                <button
                  key={s.spotifyId}
                  type="button"
                  onClick={() => handleSelectSpotify(s, m.dbResults)}
                  disabled={creating === s.spotifyId}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', fontSize: 13, border: '1px solid #1DB954',
                    background: '#fff', cursor: 'pointer',
                  }}
                >
                  {s.imageUrl && (
                    <img src={s.imageUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <span>{s.name}</span>
                  <span style={{ fontSize: 11, color: '#1DB954' }}>
                    {creating === s.spotifyId ? '등록중...' : 'Spotify'}
                  </span>
                </button>
              ))}

            {!m.loading && m.dbResults.length === 0 && m.spotifyResults.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>결과 없음</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
