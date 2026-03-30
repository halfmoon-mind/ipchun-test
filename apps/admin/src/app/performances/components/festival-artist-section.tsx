'use client';

import { LineupEditor } from './lineup-editor';
import { TimetableEditor } from './timetable-editor';
import type { Artist, PerformanceScheduleItem, LineupMode } from '@ipchun/shared';

interface FestivalArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  performanceOrder: number;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface FestivalArtistSectionProps {
  lineupMode: LineupMode;
  onLineupModeChange: (mode: LineupMode) => void;
  schedules: PerformanceScheduleItem[];
  artists: FestivalArtist[];
  onArtistsChange: (artists: FestivalArtist[]) => void;
}

export function FestivalArtistSection({
  lineupMode,
  onLineupModeChange,
  schedules,
  artists,
  onArtistsChange,
}: FestivalArtistSectionProps) {
  return (
    <div>
      {/* Mode toggle */}
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--muted-foreground)' }}>
        라인업 형식
      </label>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => onLineupModeChange('LINEUP' as LineupMode)}
          style={{
            flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer',
            border: '2px solid',
            borderColor: lineupMode === 'LINEUP' ? 'var(--foreground)' : 'var(--border)',
            background: lineupMode === 'LINEUP' ? 'var(--foreground)' : 'var(--background)',
            color: lineupMode === 'LINEUP' ? '#fff' : 'var(--foreground)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>라인업</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>일자별 출연 아티스트 순서만</div>
        </button>
        <button
          type="button"
          onClick={() => onLineupModeChange('TIMETABLE' as LineupMode)}
          style={{
            flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer',
            border: '2px solid',
            borderColor: lineupMode === 'TIMETABLE' ? 'var(--foreground)' : 'var(--border)',
            background: lineupMode === 'TIMETABLE' ? 'var(--foreground)' : 'var(--background)',
            color: lineupMode === 'TIMETABLE' ? '#fff' : 'var(--foreground)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>타임테이블</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>시간대 + 스테이지별 배치</div>
        </button>
      </div>

      {/* Editor based on mode */}
      {lineupMode === 'LINEUP' ? (
        <LineupEditor
          schedules={schedules}
          artists={artists.map((a) => ({
            artistId: a.artistId,
            artist: a.artist,
            performanceScheduleId: a.performanceScheduleId,
            performanceOrder: a.performanceOrder,
          }))}
          onChange={(lineupArtists) => {
            onArtistsChange(lineupArtists.map((a) => ({
              ...a,
              stage: null,
              startTime: null,
              endTime: null,
            })));
          }}
        />
      ) : (
        <TimetableEditor
          schedules={schedules}
          artists={artists.map((a) => ({
            artistId: a.artistId,
            artist: a.artist,
            performanceScheduleId: a.performanceScheduleId,
            stage: a.stage,
            startTime: a.startTime,
            endTime: a.endTime,
          }))}
          onChange={(timetableArtists) => {
            onArtistsChange(timetableArtists.map((a) => ({
              ...a,
              performanceOrder: 0,
            })));
          }}
        />
      )}
    </div>
  );
}
