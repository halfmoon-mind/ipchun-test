'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';

interface ArtistSearchInputProps {
  onSelect: (artist: Artist) => void;
  excludeIds?: string[];
}

export function ArtistSearchInput({ onSelect, excludeIds = [] }: ArtistSearchInputProps) {
  const [query, setQuery] = useState('');
  const [dbResults, setDbResults] = useState<Artist[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<{ spotifyId: string; name: string; imageUrl: string | null; followers: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setDbResults([]);
      setSpotifyResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [db, spotify] = await Promise.all([
          api.artists.list(query),
          api.spotify.search(query),
        ]);
        setDbResults(db.filter((a) => !excludeIds.includes(a.id)));
        setSpotifyResults(spotify.artists);
        setOpen(true);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, excludeIds]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectDb(artist: Artist) {
    onSelect(artist);
    setQuery('');
    setOpen(false);
  }

  async function handleSelectSpotify(item: { spotifyId: string; name: string; imageUrl: string | null; followers: number }) {
    setCreating(item.spotifyId);
    try {
      const detail = await api.spotify.getArtist(item.spotifyId);
      const artist = await api.artists.create({
        name: detail.name,
        description: detail.description,
        imageUrl: detail.imageUrl,
        socialLinks: { spotify: detail.spotifyUrl },
        spotifyId: detail.spotifyId,
        spotifyUrl: detail.spotifyUrl,
        monthlyListeners: detail.monthlyListeners,
        spotifyMeta: detail.spotifyMeta,
      });
      onSelect(artist);
      setQuery('');
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Spotify 아티스트 등록 실패');
    } finally {
      setCreating(null);
    }
  }

  const hasResults = dbResults.length > 0 || spotifyResults.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hasResults && setOpen(true)}
        placeholder="아티스트 이름으로 검색..."
        className="form-input w-full"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted-foreground)' }}>
          검색중...
        </div>
      )}

      {open && hasResults && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          border: '1px solid var(--border)', background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 320, overflowY: 'auto',
        }}>
          {dbResults.length > 0 && (
            <>
              <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                DB 검색 결과
              </div>
              {dbResults.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectDb(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--secondary)', cursor: 'pointer',
                  }}
                >
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    {a.spotifyId && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Spotify 연결됨</div>}
                  </div>
                </button>
              ))}
            </>
          )}

          {spotifyResults.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 11, color: 'var(--muted-foreground)',
                borderBottom: '1px solid var(--border)', background: 'var(--secondary)',
              }}>
                Spotify 검색 결과
              </div>
              {spotifyResults.map((a) => (
                <button
                  key={a.spotifyId}
                  type="button"
                  onClick={() => handleSelectSpotify(a)}
                  disabled={creating === a.spotifyId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--secondary)', cursor: 'pointer',
                  }}
                >
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#1DB954' }}>
                      Spotify · {a.followers.toLocaleString()} followers
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, padding: '2px 8px', border: '1px solid #1DB954', color: '#1DB954',
                  }}>
                    {creating === a.spotifyId ? '등록중...' : '+ 등록'}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
