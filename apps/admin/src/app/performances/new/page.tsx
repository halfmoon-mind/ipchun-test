// apps/admin/src/app/performances/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Genre,
  PerformanceStatus,
  type FetchedPerformance,
} from '@ipchun/shared';

const genreLabels: Record<Genre, string> = {
  [Genre.CONCERT]: '콘서트',
  [Genre.MUSICAL]: '뮤지컬',
  [Genre.PLAY]: '연극',
  [Genre.CLASSIC]: '클래식',
  [Genre.FESTIVAL]: '페스티벌',
  [Genre.OTHER]: '기타',
};

const statusLabels: Record<PerformanceStatus, string> = {
  [PerformanceStatus.SCHEDULED]: '예정',
  [PerformanceStatus.ON_SALE]: '판매중',
  [PerformanceStatus.SOLD_OUT]: '매진',
  [PerformanceStatus.COMPLETED]: '종료',
  [PerformanceStatus.CANCELLED]: '취소',
};

interface ScheduleEntry {
  dateTime: string;
}

interface TicketEntry {
  seatGrade: string;
  price: number;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function NewPerformancePage() {
  const router = useRouter();

  // UI state
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [genre, setGenre] = useState<Genre>(Genre.CONCERT);
  const [ageRating, setAgeRating] = useState('');
  const [runtime, setRuntime] = useState('');
  const [intermission, setIntermission] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [status, setStatus] = useState<PerformanceStatus>(
    PerformanceStatus.SCHEDULED,
  );
  const [organizer, setOrganizer] = useState('');

  // Venue
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');

  // Source
  const [platform, setPlatform] = useState('');
  const [externalId, setExternalId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ticketOpenAt, setTicketOpenAt] = useState('');
  const [bookingEndAt, setBookingEndAt] = useState('');
  const [salesStatus, setSalesStatus] = useState('');

  // Arrays
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [tickets, setTickets] = useState<TicketEntry[]>([]);

  function applyFetchedData(data: FetchedPerformance) {
    setTitle(data.title);
    setSubtitle(data.subtitle || '');
    setGenre(data.genre);
    setAgeRating(data.ageRating || '');
    setRuntime(data.runtime?.toString() || '');
    setIntermission(data.intermission?.toString() || '');
    setPosterUrl(data.posterUrl || '');
    setOrganizer(data.organizer || '');

    if (data.venue) {
      setVenueName(data.venue.name);
      setVenueAddress(data.venue.address || '');
    }

    setPlatform(data.source.platform);
    setExternalId(data.source.externalId);
    setSourceUrl(data.source.sourceUrl);
    setTicketOpenAt(
      data.source.ticketOpenAt
        ? toDatetimeLocal(data.source.ticketOpenAt)
        : '',
    );
    setBookingEndAt(
      data.source.bookingEndAt
        ? toDatetimeLocal(data.source.bookingEndAt)
        : '',
    );
    setSalesStatus(data.source.salesStatus || '');

    setSchedules(
      data.schedules.map((s) => ({
        dateTime: toDatetimeLocal(s.dateTime),
      })),
    );
    setTickets(data.tickets);
    setFetched(true);
  }

  async function handleFetch() {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const data = await api.performances.fetch(fetchUrl.trim());
      applyFetchedData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '공연 정보를 가져오지 못했습니다',
      );
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.performances.create({
        title,
        subtitle: subtitle || undefined,
        genre,
        ageRating: ageRating || undefined,
        runtime: runtime ? parseInt(runtime) : undefined,
        intermission: intermission ? parseInt(intermission) : undefined,
        posterUrl: posterUrl || undefined,
        status,
        organizer: organizer || undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        platform,
        externalId,
        sourceUrl,
        ticketOpenAt: ticketOpenAt || undefined,
        bookingEndAt: bookingEndAt || undefined,
        salesStatus: salesStatus || undefined,
        schedules: schedules
          .filter((s) => s.dateTime)
          .map((s) => ({
            dateTime: new Date(s.dateTime).toISOString(),
          })),
        tickets: tickets.filter((t) => t.seatGrade && t.price > 0),
      });
      router.push('/performances');
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  function addSchedule() {
    setSchedules([...schedules, { dateTime: '' }]);
  }

  function removeSchedule(index: number) {
    setSchedules(schedules.filter((_, i) => i !== index));
  }

  function updateSchedule(index: number, dateTime: string) {
    setSchedules(schedules.map((s, i) => (i === index ? { dateTime } : s)));
  }

  function addTicket() {
    setTickets([...tickets, { seatGrade: '', price: 0 }]);
  }

  function removeTicket(index: number) {
    setTickets(tickets.filter((_, i) => i !== index));
  }

  function updateTicket(
    index: number,
    field: keyof TicketEntry,
    value: string | number,
  ) {
    setTickets(
      tickets.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  }

  return (
    <div>
      <h1 className="page-heading mb-8">새 공연 등록</h1>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* ── URL 자동 채우기 ── */}
      <section className="max-w-2xl mb-10 p-5 border" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
        <label className="form-label mb-1">티켓 URL로 자동 채우기</label>
        <p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>
          멜론 티켓, NOL(인터파크), 티켓링크 URL을 입력하면 공연 정보를 자동으로 가져옵니다.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            placeholder="https://tickets.interpark.com/goods/..."
            className="form-input flex-1"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching || !fetchUrl.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {fetching ? '가져오는 중...' : '가져오기'}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
        {/* ── 기본 정보 ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-primary)' }}>공연 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">제목 *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className="form-input" />
            </div>

            <div>
              <label className="form-label">부제</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="form-input" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">장르 *</label>
                <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)} required className="form-input">
                  {Object.entries(genreLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">상태</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PerformanceStatus)} className="form-input">
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">관람등급</label>
                <input value={ageRating} onChange={(e) => setAgeRating(e.target.value)} className="form-input" placeholder="만 7세이상" />
              </div>
              <div>
                <label className="form-label">러닝타임 (분)</label>
                <input value={runtime} onChange={(e) => setRuntime(e.target.value)} type="number" className="form-input" />
              </div>
              <div>
                <label className="form-label">인터미션 (분)</label>
                <input value={intermission} onChange={(e) => setIntermission(e.target.value)} type="number" className="form-input" />
              </div>
            </div>

            <div>
              <label className="form-label">주최/주관</label>
              <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="form-input" />
            </div>

            <div>
              <label className="form-label">포스터 URL</label>
              <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} type="url" className="form-input" />
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt="포스터 미리보기"
                  className="mt-2 max-w-48"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>
        </section>

        {/* ── 장소 정보 ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-primary)' }}>장소</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">공연장명</label>
              <input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">주소</label>
              <input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="form-input" />
            </div>
          </div>
        </section>

        {/* ── 회차 일정 ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-primary)' }}>회차</h2>
            <button type="button" onClick={addSchedule} className="btn-secondary text-sm">+ 추가</button>
          </div>
          {schedules.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>회차 정보가 없습니다</p>
          )}
          <div className="space-y-2">
            {schedules.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={s.dateTime}
                  onChange={(e) => updateSchedule(i, e.target.value)}
                  className="form-input flex-1"
                />
                <button type="button" onClick={() => removeSchedule(i)} className="text-sm px-2 py-1" style={{ color: 'var(--destructive)' }}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 가격 정보 ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-primary)' }}>가격</h2>
            <button type="button" onClick={addTicket} className="btn-secondary text-sm">+ 추가</button>
          </div>
          {tickets.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>가격 정보가 없습니다</p>
          )}
          <div className="space-y-2">
            {tickets.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={t.seatGrade}
                  onChange={(e) => updateTicket(i, 'seatGrade', e.target.value)}
                  placeholder="좌석등급 (R석, S석...)"
                  className="form-input w-40"
                />
                <input
                  value={t.price || ''}
                  onChange={(e) => updateTicket(i, 'price', parseInt(e.target.value) || 0)}
                  type="number"
                  placeholder="가격 (원)"
                  className="form-input flex-1"
                />
                <button type="button" onClick={() => removeTicket(i)} className="text-sm px-2 py-1" style={{ color: 'var(--destructive)' }}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 출처 정보 (읽기 전용) ── */}
        {fetched && (
          <section className="p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
            <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-primary)' }}>출처</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span style={{ color: 'var(--muted-foreground)' }}>플랫폼:</span> {platform}
              </div>
              <div>
                <span style={{ color: 'var(--muted-foreground)' }}>외부 ID:</span> {externalId}
              </div>
              <div className="col-span-2">
                <span style={{ color: 'var(--muted-foreground)' }}>URL:</span>{' '}
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{sourceUrl}</a>
              </div>
              {ticketOpenAt && (
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>예매 오픈:</span>{' '}
                  <input type="datetime-local" value={ticketOpenAt} onChange={(e) => setTicketOpenAt(e.target.value)} className="form-input text-sm" />
                </div>
              )}
              {salesStatus && (
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>판매 상태:</span> {salesStatus}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 등록 버튼 ── */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving || !title || !platform}
            className="btn-primary"
          >
            {saving ? '등록 중...' : '공연 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
