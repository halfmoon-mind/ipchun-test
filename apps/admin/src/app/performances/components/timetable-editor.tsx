'use client';

import { useState } from 'react';
import { ArtistSearchInput } from './artist-search-input';
import { AssignPopover } from './assign-popover';
import type { Artist, PerformanceScheduleItem } from '@ipchun/shared';

export interface TimetableArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface TimetableEditorProps {
  schedules: PerformanceScheduleItem[];
  artists: TimetableArtist[];
  onChange: (artists: TimetableArtist[]) => void;
}

function formatDay(iso: string, index: number) {
  const d = new Date(iso);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = dayNames[d.getDay()];
  return `Day ${index + 1} · ${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${dow})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimetableEditor({ schedules, artists, onChange }: TimetableEditorProps) {
  const [assigningArtistId, setAssigningArtistId] = useState<string | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<Record<string, string>>({});

  const excludeIds = artists.map((a) => a.artistId);

  // Unique days
  const uniqueDays = schedules.reduce<PerformanceScheduleItem[]>((acc, s) => {
    const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
    if (!acc.find((x) => new Date(x.dateTime).toISOString().slice(0, 10) === dateKey)) {
      acc.push(s);
    }
    return acc;
  }, []);

  // All stages derived from artists
  const allStages = [...new Set(artists.map((a) => a.stage).filter(Boolean))] as string[];

  function getAssignedForDayAndStage(scheduleId: string, stage: string) {
    return artists
      .filter((a) => a.performanceScheduleId === scheduleId && a.stage === stage && a.startTime)
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
  }

  // Unassigned = no stage or no startTime
  const unassigned = artists.filter((a) => !a.stage || !a.startTime);

  function handleAdd(artist: Artist) {
    onChange([
      ...artists,
      { artistId: artist.id, artist, performanceScheduleId: null, stage: null, startTime: null, endTime: null },
    ]);
  }

  function handleAssign(artistId: string, scheduleId: string, stage: string, startTime: string, endTime: string) {
    const scheduleDate = new Date(schedules.find((s) => s.id === scheduleId)!.dateTime);
    const dateStr = scheduleDate.toISOString().slice(0, 10);

    const updated = artists.map((a) => {
      if (a.artistId !== artistId) return a;
      return {
        ...a,
        performanceScheduleId: scheduleId,
        stage,
        startTime: `${dateStr}T${startTime}:00`,
        endTime: `${dateStr}T${endTime}:00`,
      };
    });
    onChange(updated);
    setAssigningArtistId(null);
  }

  function handleUnassign(artistId: string) {
    const updated = artists.map((a) => {
      if (a.artistId !== artistId) return a;
      return { ...a, performanceScheduleId: null, stage: null, startTime: null, endTime: null };
    });
    onChange(updated);
  }

  function handleRemove(artistId: string) {
    onChange(artists.filter((a) => a.artistId !== artistId));
  }

  return (
    <div>
      {uniqueDays.map((schedule, dayIdx) => {
        const dayStages = allStages.filter((stage) =>
          artists.some((a) => a.performanceScheduleId === schedule.id && a.stage === stage),
        );
        const currentStage = activeStageTab[schedule.id] ?? dayStages[0] ?? '';

        return (
          <div key={schedule.id} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {formatDay(schedule.dateTime, dayIdx)}
            </div>

            {/* Stage tabs */}
            {dayStages.length > 0 && (
              <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
                {dayStages.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setActiveStageTab({ ...activeStageTab, [schedule.id]: stage })}
                    style={{
                      padding: '8px 16px', fontSize: 12, fontWeight: currentStage === stage ? 600 : 400,
                      border: '1px solid',
                      borderColor: currentStage === stage ? 'var(--foreground)' : 'var(--border)',
                      background: currentStage === stage ? 'var(--foreground)' : 'transparent',
                      color: currentStage === stage ? '#fff' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                    }}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            )}

            {/* Assigned artists for current stage */}
            {currentStage && getAssignedForDayAndStage(schedule.id, currentStage).map((a) => (
              <div key={a.artistId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, minWidth: 90, fontFamily: 'monospace' }}>
                  {formatTime(a.startTime!)} – {formatTime(a.endTime!)}
                </div>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
                <button type="button" onClick={() => handleUnassign(a.artistId)}
                  style={{ fontSize: 11, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>해제</button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Unassigned pool */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>
            미배정 아티스트 ({unassigned.length})
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {unassigned.map((a) => (
            <div key={a.artistId} style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                border: '1px solid var(--border)', background: 'var(--secondary)',
              }}>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a.artist.name}</span>
                {uniqueDays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssigningArtistId(assigningArtistId === a.artistId ? null : a.artistId)}
                    style={{ fontSize: 11, padding: '2px 8px', background: 'var(--accent)', border: 'none', cursor: 'pointer' }}
                  >
                    배정
                  </button>
                )}
                <button type="button" onClick={() => handleRemove(a.artistId)}
                  style={{ fontSize: 11, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>

              {assigningArtistId === a.artistId && uniqueDays.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4 }}>
                  <AssignPopover
                    artist={a.artist}
                    stages={allStages}
                    scheduleOptions={uniqueDays.map((s, i) => ({ id: s.id, label: `Day ${i + 1}` }))}
                    onAssign={(scheduleId, stage, startTime, endTime) => handleAssign(a.artistId, scheduleId, stage, startTime, endTime)}
                    onCancel={() => setAssigningArtistId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <ArtistSearchInput onSelect={handleAdd} excludeIds={excludeIds} />
      </div>

      {uniqueDays.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>
          회차(일정)를 먼저 등록하면 Day가 자동으로 생성됩니다.
        </p>
      )}
    </div>
  );
}
