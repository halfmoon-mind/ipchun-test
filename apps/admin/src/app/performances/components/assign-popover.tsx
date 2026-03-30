'use client';

import { useState } from 'react';
import type { Artist } from '@ipchun/shared';

interface ScheduleOption {
  id: string;
  label: string;
}

interface AssignPopoverProps {
  artist: Artist;
  stages: string[];
  scheduleOptions: ScheduleOption[];
  onAssign: (scheduleId: string, stage: string, startTime: string, endTime: string) => void;
  onCancel: () => void;
}

export function AssignPopover({ artist, stages, scheduleOptions, onAssign, onCancel }: AssignPopoverProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState(scheduleOptions[0]?.id ?? '');
  const [selectedStage, setSelectedStage] = useState(stages[0] ?? '');
  const [newStage, setNewStage] = useState('');
  const [isNewStage, setIsNewStage] = useState(stages.length === 0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const activeStage = isNewStage ? newStage : selectedStage;

  function handleSubmit() {
    if (!selectedScheduleId || !activeStage.trim() || !startTime || !endTime) return;
    onAssign(selectedScheduleId, activeStage.trim(), startTime, endTime);
  }

  return (
    <div style={{
      border: '1px solid var(--border)', background: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: 16, maxWidth: 320,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {artist.imageUrl && (
          <img src={artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div style={{ fontSize: 14, fontWeight: 600 }}>{artist.name}</div>
      </div>

      {scheduleOptions.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Day</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {scheduleOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedScheduleId(s.id)}
                style={{
                  padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                  border: selectedScheduleId === s.id ? '2px solid var(--foreground)' : '1px solid var(--border)',
                  background: selectedScheduleId === s.id ? 'var(--foreground)' : 'transparent',
                  color: selectedScheduleId === s.id ? '#fff' : 'var(--foreground)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>스테이지</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSelectedStage(s); setIsNewStage(false); }}
              style={{
                padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                border: !isNewStage && selectedStage === s ? '2px solid var(--foreground)' : '1px solid var(--border)',
                background: !isNewStage && selectedStage === s ? 'var(--foreground)' : 'transparent',
                color: !isNewStage && selectedStage === s ? '#fff' : 'var(--foreground)',
              }}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsNewStage(true)}
            style={{
              padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              border: isNewStage ? '2px solid var(--foreground)' : '1px dashed var(--border)',
              background: isNewStage ? 'var(--foreground)' : 'transparent',
              color: isNewStage ? '#fff' : 'var(--muted-foreground)',
            }}
          >
            + 새 스테이지
          </button>
        </div>
        {isNewStage && (
          <input
            type="text"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            placeholder="스테이지 이름 입력"
            className="form-input w-full"
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>시작</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-input w-full" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>종료</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-input w-full" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleSubmit}
          disabled={!activeStage.trim() || !startTime || !endTime}
          className="btn-primary" style={{ flex: 1 }}>배정</button>
        <button type="button" onClick={onCancel}
          className="btn-secondary">취소</button>
      </div>
    </div>
  );
}
