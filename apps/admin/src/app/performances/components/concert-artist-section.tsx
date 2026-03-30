'use client';

import { ArtistSearchInput } from './artist-search-input';
import type { Artist } from '@ipchun/shared';

interface ConcertArtist {
  artistId: string;
  artist: Artist;
  role: string | null;
}

interface ConcertArtistSectionProps {
  artists: ConcertArtist[];
  onArtistsChange: (artists: ConcertArtist[]) => void;
}

export function ConcertArtistSection({ artists, onArtistsChange }: ConcertArtistSectionProps) {
  const excludeIds = artists.map((a) => a.artistId);

  function handleAdd(artist: Artist) {
    onArtistsChange([...artists, { artistId: artist.id, artist, role: null }]);
  }

  function handleRemove(artistId: string) {
    onArtistsChange(artists.filter((a) => a.artistId !== artistId));
  }

  function handleRoleChange(artistId: string, role: string) {
    onArtistsChange(artists.map((a) => a.artistId === artistId ? { ...a, role: role || null } : a));
  }

  return (
    <div>
      {artists.map((a) => (
        <div key={a.artistId} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 10,
          border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
        }}>
          {a.artist.imageUrl && (
            <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
          <select
            value={a.role ?? ''}
            onChange={(e) => handleRoleChange(a.artistId, e.target.value)}
            className="form-input"
            style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
          >
            <option value="">역할 없음</option>
            <option value="메인">메인</option>
            <option value="게스트">게스트</option>
          </select>
          <button type="button" onClick={() => handleRemove(a.artistId)}
            style={{ fontSize: 12, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <ArtistSearchInput onSelect={handleAdd} excludeIds={excludeIds} />
      </div>
    </div>
  );
}
