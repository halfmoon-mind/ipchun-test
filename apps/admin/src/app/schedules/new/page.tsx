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
      <h1 className="text-2xl font-bold mb-6">새 일정 등록</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            아티스트 ID *
          </label>
          <input
            name="artistId"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="아티스트 목록 페이지에서 ID 확인 (UUID 형식)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            name="title"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">유형 *</label>
          <select
            name="type"
            required
            className="w-full border rounded px-3 py-2"
          >
            {Object.entries(scheduleTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              시작일 *
            </label>
            <input
              name="startDate"
              type="datetime-local"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">종료일</label>
            <input
              name="endDate"
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">장소</label>
          <input
            name="location"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">주소</label>
          <input
            name="address"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            name="description"
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '등록 중...' : '등록'}
        </button>
      </form>
    </div>
  );
}
