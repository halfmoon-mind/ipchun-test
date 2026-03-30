'use client';

import { FestivalArtistSection } from './festival-artist-section';
import { ConcertArtistSection } from './concert-artist-section';
import type { Artist, PerformanceScheduleItem, LineupMode } from '@ipchun/shared';

interface ArtistEntry {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  role: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number;
}

interface ArtistSectionProps {
  genre: string;
  lineupMode: LineupMode | null;
  onLineupModeChange: (mode: LineupMode) => void;
  schedules: PerformanceScheduleItem[];
  artists: ArtistEntry[];
  onArtistsChange: (artists: ArtistEntry[]) => void;
}

export type { ArtistEntry };

export function ArtistSection({
  genre,
  lineupMode,
  onLineupModeChange,
  schedules,
  artists,
  onArtistsChange,
}: ArtistSectionProps) {
  const isFestival = genre === 'FESTIVAL';

  return (
    <div>
      <h3 className="form-label" style={{ fontSize: 14, marginBottom: 12 }}>
        {isFestival ? '페스티벌 아티스트' : '아티스트'}
      </h3>

      {isFestival ? (
        <FestivalArtistSection
          lineupMode={lineupMode ?? ('LINEUP' as LineupMode)}
          onLineupModeChange={onLineupModeChange}
          schedules={schedules}
          artists={artists}
          onArtistsChange={onArtistsChange}
        />
      ) : (
        <ConcertArtistSection
          artists={artists.map((a) => ({ artistId: a.artistId, artist: a.artist, role: a.role }))}
          onArtistsChange={(concertArtists) => {
            onArtistsChange(concertArtists.map((a) => ({
              ...a,
              performanceScheduleId: null,
              stage: null,
              startTime: null,
              endTime: null,
              performanceOrder: 0,
            })));
          }}
        />
      )}
    </div>
  );
}
