'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ScheduleType } from '@ipchun/shared';
import LineupSection, { type LineupEntry } from './lineup-section';

const scheduleTypeLabels: Record<ScheduleType, string> = {
  [ScheduleType.CONCERT]: '콘서트',
  [ScheduleType.BUSKING]: '버스킹',
  [ScheduleType.FESTIVAL]: '페스티벌',
  [ScheduleType.RELEASE]: '발매',
  [ScheduleType.OTHER]: '기타',
};

// ISO 8601 → datetime-local input 형식으로 변환
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // YYYY-MM-DDTHH:mm 형식
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

export default function NewSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapeUrl, setScrapeUrl] = useState('');

  // Controlled form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>(ScheduleType.CONCERT);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [lineups, setLineups] = useState<LineupEntry[]>([]);

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setError(null);
    try {
      const data = await api.scrape.schedule(scrapeUrl.trim());
      // 빈 필드만 채움
      if (!title && data.title) setTitle(data.title);
      if (!description && data.description) setDescription(data.description);
      if (!startDate && data.startDate) setStartDate(toDatetimeLocal(data.startDate));
      if (!endDate && data.endDate) setEndDate(toDatetimeLocal(data.endDate));
      if (!location && data.location) setLocation(data.location);
      if (!address && data.address) setAddress(data.address);
      if (!imageUrl && data.imageUrl) setImageUrl(data.imageUrl);
      if (data.images && data.images.length > 0) {
        setScrapedImages(data.images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '링크 정보를 가져오지 못했습니다');
    } finally {
      setScraping(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const schedule = await api.schedules.create({
        title,
        type,
        startDate,
        endDate: endDate || null,
        location: location || null,
        address: address || null,
        description: description || null,
        imageUrl: imageUrl || null,
      } as Parameters<typeof api.schedules.create>[0]);

      const matchedLineups = lineups.filter((l) => l.artistId);
      if (matchedLineups.length > 0) {
        await api.schedules.replaceLineups(
          schedule.id,
          matchedLineups.map((l, i) => ({
            artistId: l.artistId,
            stageName: l.stageName || undefined,
            startTime: l.startTime || undefined,
            endTime: l.endTime || undefined,
            performanceOrder: l.performanceOrder ?? i + 1,
          })),
        );
      }

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

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* URL 자동 채우기 섹션 */}
      <div className="max-w-xl mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <label className="form-label mb-2">링크로 자동 채우기</label>
        <p className="text-sm text-gray-500 mb-3">
          인스타그램 포스트, 인터파크 티켓 등의 링크를 입력하면 일정 정보를 자동으로 채워줍니다.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="https://instagram.com/p/... 또는 티켓 링크"
            className="form-input flex-1"
          />
          <button
            type="button"
            onClick={handleScrape}
            disabled={scraping || !scrapeUrl.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {scraping ? '가져오는 중...' : '자동 채우기'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <div>
          <label className="form-label">제목 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">유형 *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ScheduleType)}
            required
            className="form-input"
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
            <label className="form-label">시작일 *</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              type="datetime-local"
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              type="datetime-local"
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">장소</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">주소</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">이미지 URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            type="url"
            className="form-input"
            placeholder="자동 채우기로 가져오거나 직접 입력"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="미리보기"
              className="mt-2 max-w-48 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div>
          <label className="form-label">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="form-input"
            style={{ resize: 'vertical' }}
          />
        </div>

        <LineupSection
          images={scrapedImages}
          lineups={lineups}
          onLineupsChange={setLineups}
        />

        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
