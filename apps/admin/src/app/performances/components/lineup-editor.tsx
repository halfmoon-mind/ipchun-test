'use client';

import { ArtistSearchInput } from './artist-search-input';
import type { Artist, PerformanceScheduleItem } from '@ipchun/shared';

interface LineupArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  performanceOrder: number;
}

interface LineupEditorProps {
  schedules: PerformanceScheduleItem[];
  artists: LineupArtist[];
  onChange: (artists: LineupArtist[]) => void;
}

function formatDay(iso: string, index: number) {
  const d = new Date(iso);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = dayNames[d.getDay()];
  return `Day ${index + 1} · ${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${dow})`;
}

export function LineupEditor({ schedules, artists, onChange }: LineupEditorProps) {
  const excludeIds = artists.map((a) => a.artistId);

  // Group by unique dates (yyyy-mm-dd)
  const uniqueDays = schedules.reduce<PerformanceScheduleItem[]>((acc, s) => {
    const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
    if (!acc.find((x) => new Date(x.dateTime).toISOString().slice(0, 10) === dateKey)) {
      acc.push(s);
    }
    return acc;
  }, []);

  function getArtistsForDay(scheduleId: string) {
    return artists
      .filter((a) => a.performanceScheduleId === scheduleId)
      .sort((a, b) => a.performanceOrder - b.performanceOrder);
  }

  function handleAdd(scheduleId: string, artist: Artist) {
    const dayArtists = getArtistsForDay(scheduleId);
    const maxOrder = dayArtists.length > 0 ? Math.max(...dayArtists.map((a) => a.performanceOrder)) : 0;
    onChange([
      ...artists,
      { artistId: artist.id, artist, performanceScheduleId: scheduleId, performanceOrder: maxOrder + 1 },
    ]);
  }

  function handleRemove(artistId: string) {
    onChange(artists.filter((a) => a.artistId !== artistId));
  }

  function handleMoveUp(scheduleId: string, artistId: string) {
    const dayArtists = getArtistsForDay(scheduleId);
    const idx = dayArtists.findIndex((a) => a.artistId === artistId);
    if (idx <= 0) return;

    const updated = artists.map((a) => {
      if (a.artistId === dayArtists[idx].artistId) return { ...a, performanceOrder: dayArtists[idx - 1].performanceOrder };
      if (a.artistId === dayArtists[idx - 1].artistId) return { ...a, performanceOrder: dayArtists[idx].performanceOrder };
      return a;
    });
    onChange(updated);
  }

  function handleMoveDown(scheduleId: string, artistId: string) {
    const dayArtists = getArtistsForDay(scheduleId);
    const idx = dayArtists.findIndex((a) => a.artistId === artistId);
    if (idx < 0 || idx >= dayArtists.length - 1) return;

    const updated = artists.map((a) => {
      if (a.artistId === dayArtists[idx].artistId) return { ...a, performanceOrder: dayArtists[idx + 1].performanceOrder };
      if (a.artistId === dayArtists[idx + 1].artistId) return { ...a, performanceOrder: dayArtists[idx].performanceOrder };
      return a;
    });
    onChange(updated);
  }

  return (
    <div>
      {uniqueDays.map((schedule, dayIdx) => {
        const dayArtists = getArtistsForDay(schedule.id);
        return (
          <div key={schedule.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {formatDay(schedule.dateTime, dayIdx)}
            </div>

            {dayArtists.map((a, i) => (
              <div
                key={a.artistId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                  border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => handleMoveUp(schedule.id, a.artistId)} disabled={i === 0}
                    style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: i === 0 ? 'var(--border)' : 'var(--foreground)' }}>▲</button>
                  <button type="button" onClick={() => handleMoveDown(schedule.id, a.artistId)} disabled={i === dayArtists.length - 1}
                    style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: i === dayArtists.length - 1 ? 'var(--border)' : 'var(--foreground)' }}>▼</button>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--muted-foreground)', width: 20, textAlign: 'center', fontSize: 13 }}>{i + 1}</div>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
                <button type="button" onClick={() => handleRemove(a.artistId)}
                  style={{ fontSize: 12, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <ArtistSearchInput onSelect={(artist) => handleAdd(schedule.id, artist)} excludeIds={excludeIds} />
            </div>
          </div>
        );
      })}

      {uniqueDays.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          회차(일정)를 먼저 등록하면 Day가 자동으로 생성됩니다.
        </p>
      )}
    </div>
  );
}
