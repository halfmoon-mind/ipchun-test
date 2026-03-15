'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ScheduleType } from '@ipchun/shared';

const scheduleTypeLabels: Record<ScheduleType, string> = {
  [ScheduleType.CONCERT]: '콘서트',
  [ScheduleType.BUSKING]: '버스킹',
  [ScheduleType.FESTIVAL]: '페스티벌',
  [ScheduleType.RELEASE]: '발매',
  [ScheduleType.OTHER]: '기타',
};

export default function NewSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await api.schedules.create({
        artistId: formData.get('artistId') as string,
        title: formData.get('title') as string,
        type: formData.get('type') as ScheduleType,
        startDate: formData.get('startDate') as string,
        endDate: (formData.get('endDate') as string) || null,
        location: (formData.get('location') as string) || null,
        address: (formData.get('address') as string) || null,
        description: (formData.get('description') as string) || null,
        imageUrl: null,
      });
      router.push('/schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-heading mb-8">새 일정 등록</h1>

      {error && (
        <div className="alert-error mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <div>
          <label className="form-label">아티스트 ID *</label>
          <input
            name="artistId"
            required
            className="form-input"
            placeholder="아티스트 목록 페이지에서 ID 확인 (UUID 형식)"
          />
        </div>

        <div>
          <label className="form-label">제목 *</label>
          <input name="title" required className="form-input" />
        </div>

        <div>
          <label className="form-label">유형 *</label>
          <select name="type" required className="form-input">
            {Object.entries(scheduleTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">시작일 *</label>
            <input
              name="startDate"
              type="datetime-local"
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input
              name="endDate"
              type="datetime-local"
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">장소</label>
          <input name="location" className="form-input" />
        </div>

        <div>
          <label className="form-label">주소</label>
          <input name="address" className="form-input" />
        </div>

        <div>
          <label className="form-label">설명</label>
          <textarea
            name="description"
            rows={4}
            className="form-input"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
