# Admin 공연 수정/삭제 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin 앱에서 공연(Performance)을 조회, 수정, 삭제할 수 있는 UI와 서버 API를 완성한다.

**Architecture:** 기존 생성 폼을 공통 컴포넌트로 추출하여 수정 페이지에서 재사용. 서버 PATCH API를 확장하여 스케줄/티켓/소스/공연장까지 한 트랜잭션으로 업데이트. 상세 페이지를 진입점으로 수정/삭제 접근.

**Tech Stack:** Next.js 16, NestJS 11, Prisma 7, TypeScript, @ipchun/shared

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/server/src/performance/performance.service.ts` | update 메서드를 venue/schedule/ticket/source 포함하도록 확장 |
| Modify | `apps/admin/src/lib/api.ts` | `performances.update` 메서드 추가 |
| Modify | `apps/admin/src/app/performances/page.tsx` | 카드를 상세 페이지 링크로 변경 |
| Create | `apps/admin/src/app/performances/components/performance-form.tsx` | 공통 폼 컴포넌트 |
| Modify | `apps/admin/src/app/performances/new/page.tsx` | 공통 폼 사용하도록 리팩터 |
| Create | `apps/admin/src/app/performances/[id]/page.tsx` | 상세 페이지 |
| Create | `apps/admin/src/app/performances/[id]/edit/page.tsx` | 수정 페이지 |

---

### Task 1: 서버 — update 메서드 확장

**Files:**
- Modify: `apps/server/src/performance/performance.service.ts:153-170`

- [ ] **Step 1: update 메서드를 트랜잭션 기반으로 확장**

`performance.service.ts`의 `update` 메서드를 아래 코드로 교체한다. 기존에는 Performance 테이블 필드만 업데이트했지만, 이제 venue upsert, schedule replace, ticket replace, source update를 모두 하나의 트랜잭션으로 처리한다.

```typescript
async update(id: string, dto: UpdatePerformanceDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1) Venue
    let venueId: string | null | undefined = undefined;
    if (dto.venueName !== undefined) {
      if (dto.venueName) {
        const venue = await tx.venue.upsert({
          where: { name: dto.venueName },
          update: {
            address: dto.venueAddress ?? undefined,
            latitude: dto.venueLatitude ?? undefined,
            longitude: dto.venueLongitude ?? undefined,
          },
          create: {
            name: dto.venueName,
            address: dto.venueAddress ?? null,
            latitude: dto.venueLatitude ?? null,
            longitude: dto.venueLongitude ?? null,
          },
        });
        venueId = venue.id;
      } else {
        venueId = null;
      }
    }

    // 2) Performance
    await tx.performance.update({
      where: { id },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        genre: dto.genre,
        ageRating: dto.ageRating,
        runtime: dto.runtime,
        intermission: dto.intermission,
        posterUrl: dto.posterUrl,
        status: dto.status,
        organizer: dto.organizer,
        ...(venueId !== undefined && { venueId }),
      },
    });

    // 3) Schedules (replace)
    if (dto.schedules !== undefined) {
      await tx.performanceSchedule.deleteMany({ where: { performanceId: id } });
      if (dto.schedules.length > 0) {
        await tx.performanceSchedule.createMany({
          data: dto.schedules.map((s) => ({
            performanceId: id,
            dateTime: new Date(s.dateTime),
          })),
          skipDuplicates: true,
        });
      }
    }

    // 4) Source & Tickets
    if (dto.platform !== undefined || dto.ticketOpenAt !== undefined || dto.bookingEndAt !== undefined || dto.salesStatus !== undefined) {
      const existingSource = await tx.performanceSource.findFirst({
        where: { performanceId: id },
      });

      if (existingSource) {
        await tx.performanceSource.update({
          where: { id: existingSource.id },
          data: {
            ticketOpenAt: dto.ticketOpenAt ? new Date(dto.ticketOpenAt) : existingSource.ticketOpenAt,
            bookingEndAt: dto.bookingEndAt ? new Date(dto.bookingEndAt) : existingSource.bookingEndAt,
            salesStatus: dto.salesStatus ?? existingSource.salesStatus,
          },
        });

        // Replace tickets if provided
        if (dto.tickets !== undefined) {
          await tx.ticket.deleteMany({ where: { sourceId: existingSource.id } });
          if (dto.tickets.length > 0) {
            await tx.ticket.createMany({
              data: dto.tickets.map((t) => ({
                sourceId: existingSource.id,
                seatGrade: t.seatGrade,
                price: t.price,
              })),
            });
          }
        }
      }
    } else if (dto.tickets !== undefined) {
      // Tickets changed but no source fields — still replace tickets on first source
      const existingSource = await tx.performanceSource.findFirst({
        where: { performanceId: id },
      });
      if (existingSource) {
        await tx.ticket.deleteMany({ where: { sourceId: existingSource.id } });
        if (dto.tickets.length > 0) {
          await tx.ticket.createMany({
            data: dto.tickets.map((t) => ({
              sourceId: existingSource.id,
              seatGrade: t.seatGrade,
              price: t.price,
            })),
          });
        }
      }
    }

    return tx.performance.findUniqueOrThrow({
      where: { id },
      include: PERFORMANCE_INCLUDE,
    });
  });
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter server build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/server/src/performance/performance.service.ts
git commit -m "feat(server): extend performance update to handle venue/schedule/ticket/source"
```

---

### Task 2: Admin API 클라이언트 — update 메서드 추가

**Files:**
- Modify: `apps/admin/src/lib/api.ts:94-109`

- [ ] **Step 1: performances 객체에 update 메서드 추가**

`api.ts`의 `performances` 객체에서 `delete` 뒤에 `update` 메서드를 추가한다:

```typescript
performances: {
  list: () => request<Performance[]>('/performances'),
  get: (id: string) => request<Performance>(`/performances/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Performance>('/performances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Performance>(`/performances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/performances/${id}`, { method: 'DELETE' }),
  fetch: (url: string) =>
    request<FetchedPerformance>('/performances/fetch', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
},
```

- [ ] **Step 2: 커밋**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat(admin): add performances.update API method"
```

---

### Task 3: 공통 폼 컴포넌트 추출

**Files:**
- Create: `apps/admin/src/app/performances/components/performance-form.tsx`
- Modify: `apps/admin/src/app/performances/new/page.tsx`

- [ ] **Step 1: components 디렉토리 확인**

```bash
ls apps/admin/src/app/performances/
```

- [ ] **Step 2: performance-form.tsx 생성**

`new/page.tsx`에서 폼 로직을 추출하여 공통 컴포넌트를 만든다. Props로 `mode`와 `initialData`를 받는다.

```tsx
// apps/admin/src/app/performances/components/performance-form.tsx
'use client';

import { useState } from 'react';
import {
  Genre,
  PerformanceStatus,
  type Performance,
  type FetchedPerformance,
} from '@ipchun/shared';

const genreLabels: Record<Genre, string> = {
  [Genre.CONCERT]: '콘서트',
  [Genre.MUSICAL]: '뮤지컬',
  [Genre.PLAY]: '연극',
  [Genre.CLASSIC]: '클래식',
  [Genre.FESTIVAL]: '페스티벌',
  [Genre.BUSKING]: '버스킹',
  [Genre.RELEASE]: '발매',
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

interface PerformanceFormProps {
  mode: 'create' | 'edit';
  initialData?: Performance;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onFetch?: (url: string) => Promise<FetchedPerformance>;
}

export function PerformanceForm({ mode, initialData, onSubmit, onFetch }: PerformanceFormProps) {
  // UI state
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(mode === 'edit' && !!initialData?.sources?.length);

  // Form fields — pre-fill from initialData in edit mode
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [genre, setGenre] = useState<Genre>(initialData?.genre ?? Genre.CONCERT);
  const [ageRating, setAgeRating] = useState(initialData?.ageRating ?? '');
  const [runtime, setRuntime] = useState(initialData?.runtime?.toString() ?? '');
  const [intermission, setIntermission] = useState(initialData?.intermission?.toString() ?? '');
  const [posterUrl, setPosterUrl] = useState(initialData?.posterUrl ?? '');
  const [status, setStatus] = useState<PerformanceStatus>(initialData?.status ?? PerformanceStatus.SCHEDULED);
  const [organizer, setOrganizer] = useState(initialData?.organizer ?? '');

  // Venue
  const [venueName, setVenueName] = useState(initialData?.venue?.name ?? '');
  const [venueAddress, setVenueAddress] = useState(initialData?.venue?.address ?? '');

  // Source (from first source if exists)
  const source = initialData?.sources?.[0];
  const [platform, setPlatform] = useState(source?.platform ?? '');
  const [externalId, setExternalId] = useState(source?.externalId ?? '');
  const [sourceUrl, setSourceUrl] = useState(source?.sourceUrl ?? '');
  const [ticketOpenAt, setTicketOpenAt] = useState(source?.ticketOpenAt ? toDatetimeLocal(source.ticketOpenAt) : '');
  const [bookingEndAt, setBookingEndAt] = useState(source?.bookingEndAt ? toDatetimeLocal(source.bookingEndAt) : '');
  const [salesStatus, setSalesStatus] = useState(source?.salesStatus ?? '');

  // Arrays
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(
    initialData?.schedules?.map((s) => ({ dateTime: toDatetimeLocal(s.dateTime) })) ?? [],
  );
  const [tickets, setTickets] = useState<TicketEntry[]>(
    source?.tickets?.map((t) => ({ seatGrade: t.seatGrade, price: t.price })) ?? [],
  );

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
    setTicketOpenAt(data.source.ticketOpenAt ? toDatetimeLocal(data.source.ticketOpenAt) : '');
    setBookingEndAt(data.source.bookingEndAt ? toDatetimeLocal(data.source.bookingEndAt) : '');
    setSalesStatus(data.source.salesStatus || '');

    if (
      data.source.salesStatus &&
      Object.values(PerformanceStatus).includes(data.source.salesStatus as PerformanceStatus)
    ) {
      setStatus(data.source.salesStatus as PerformanceStatus);
    }

    setSchedules(data.schedules.map((s) => ({ dateTime: toDatetimeLocal(s.dateTime) })));
    setTickets(data.tickets);
    setFetched(true);
  }

  async function handleFetch() {
    if (!onFetch || !fetchUrl.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const data = await onFetch(fetchUrl.trim());
      applyFetchedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공연 정보를 가져오지 못했습니다');
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        subtitle: subtitle || undefined,
        description: description || undefined,
        genre,
        ageRating: ageRating || undefined,
        runtime: runtime ? parseInt(runtime) : undefined,
        intermission: intermission ? parseInt(intermission) : undefined,
        posterUrl: posterUrl || undefined,
        status,
        organizer: organizer || undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        schedules: schedules
          .filter((s) => s.dateTime)
          .map((s) => ({ dateTime: new Date(s.dateTime).toISOString() })),
        tickets: tickets.filter((t) => t.seatGrade && t.price > 0),
      };

      if (platform && externalId && sourceUrl) {
        payload.platform = platform;
        payload.externalId = externalId;
        payload.sourceUrl = sourceUrl;
        payload.ticketOpenAt = ticketOpenAt || undefined;
        payload.bookingEndAt = bookingEndAt || undefined;
        payload.salesStatus = salesStatus || undefined;
      }

      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
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

  function updateTicket(index: number, field: keyof TicketEntry, value: string | number) {
    setTickets(tickets.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  return (
    <>
      {error && <div className="alert-error mb-6">{error}</div>}

      {/* ── URL 자동 채우기 (create mode only) ── */}
      {mode === 'create' && onFetch && (
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
      )}

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
            <div>
              <label className="form-label">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="공연 설명 (선택)"
                rows={3}
                className="form-input"
              />
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
                  className="form-input flex-1 min-w-[120px]"
                />
                <button type="button" onClick={() => removeTicket(i)} className="text-sm px-2 py-1" style={{ color: 'var(--destructive)' }}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 출처 정보 ── */}
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

        {/* ── 제출 버튼 ── */}
        <div className="pt-4">
          <button type="submit" disabled={saving || !title} className="btn-primary">
            {saving ? '저장 중...' : mode === 'create' ? '공연 등록' : '저장'}
          </button>
        </div>
      </form>
    </>
  );
}
```

- [ ] **Step 3: new/page.tsx를 공통 폼 사용하도록 리팩터**

`new/page.tsx`를 아래 코드로 교체한다. 기존 폼 로직은 모두 `PerformanceForm`으로 이동했으므로 래퍼만 남긴다.

```tsx
// apps/admin/src/app/performances/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PerformanceForm } from '../components/performance-form';

export default function NewPerformancePage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await api.performances.create(data);
    router.push('/performances');
  }

  async function handleFetch(url: string) {
    return api.performances.fetch(url);
  }

  return (
    <div>
      <h1 className="page-heading mb-8">새 공연 등록</h1>
      <PerformanceForm mode="create" onSubmit={handleSubmit} onFetch={handleFetch} />
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter admin build`
Expected: 빌드 성공, 기존 생성 기능이 동일하게 동작

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/src/app/performances/components/performance-form.tsx apps/admin/src/app/performances/new/page.tsx
git commit -m "refactor(admin): extract PerformanceForm component from new page"
```

---

### Task 4: 목록 페이지 — 카드 링크 추가

**Files:**
- Modify: `apps/admin/src/app/performances/page.tsx`

- [ ] **Step 1: 카드를 Link로 감싸기**

목록 페이지에서 각 공연 카드의 `<div>` 컨테이너를 Next.js `Link`로 변경하여 클릭 시 상세 페이지로 이동하도록 한다.

기존 코드:
```tsx
<div
  key={p.id}
  className="flex gap-4 p-4 border"
  style={{ borderColor: 'var(--border)' }}
>
```

변경 코드:
```tsx
<Link
  key={p.id}
  href={`/performances/${p.id}`}
  className="flex gap-4 p-4 border hover:bg-[var(--secondary)] transition-colors"
  style={{ borderColor: 'var(--border)' }}
>
```

그리고 닫는 태그도 `</div>` → `</Link>`로 변경.

소스 플랫폼 링크의 `<a>` 태그에 `onClick={(e) => e.stopPropagation()}`을 추가하여 카드 링크와 충돌하지 않게 한다:

```tsx
<a
  key={s.id}
  href={s.sourceUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => e.stopPropagation()}
  className="inline-block px-2 py-0.5 text-xs border"
  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
>
```

- [ ] **Step 2: 커밋**

```bash
git add apps/admin/src/app/performances/page.tsx
git commit -m "feat(admin): make performance cards link to detail page"
```

---

### Task 5: 상세 페이지

**Files:**
- Create: `apps/admin/src/app/performances/[id]/page.tsx`

- [ ] **Step 1: 상세 페이지 생성**

공연 데이터를 조회하여 읽기 전용으로 표시하고, 상단에 수정/삭제 버튼을 배치한다.

```tsx
// apps/admin/src/app/performances/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Performance } from '@ipchun/shared';

const genreLabels: Record<string, string> = {
  CONCERT: '콘서트', MUSICAL: '뮤지컬', PLAY: '연극', CLASSIC: '클래식',
  FESTIVAL: '페스티벌', BUSKING: '버스킹', RELEASE: '발매', OTHER: '기타',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: '예정', ON_SALE: '판매중', SOLD_OUT: '매진', COMPLETED: '종료', CANCELLED: '취소',
};

const platformLabels: Record<string, string> = {
  MELON: '멜론', NOL: 'NOL', TICKETLINK: '티켓링크',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PerformanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.performances.get(id)
      .then(setPerformance)
      .catch(() => setError('공연 정보를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!performance) return;
    if (!confirm(`정말 "${performance.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api.performances.delete(id);
      router.push('/performances');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  }

  if (loading) return <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!performance) return <div className="alert-error">공연을 찾을 수 없습니다</div>;

  const source = performance.sources[0];

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">{performance.title}</h1>
        <div className="flex gap-2">
          <Link href={`/performances/${id}/edit`} className="btn-primary">수정</Link>
          <button onClick={handleDelete} className="btn-secondary" style={{ color: 'var(--destructive)' }}>삭제</button>
        </div>
      </div>

      {performance.subtitle && (
        <p className="text-base mb-6" style={{ color: 'var(--muted-foreground)' }}>{performance.subtitle}</p>
      )}

      <div className="space-y-8">
        {/* 포스터 + 기본 정보 */}
        <section className="flex gap-6">
          {performance.posterUrl && (
            <img
              src={performance.posterUrl}
              alt={performance.title}
              className="w-40 h-56 object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="space-y-2 text-sm">
            <p><span style={{ color: 'var(--muted-foreground)' }}>장르:</span> {genreLabels[performance.genre] || performance.genre}</p>
            <p><span style={{ color: 'var(--muted-foreground)' }}>상태:</span> {statusLabels[performance.status] || performance.status}</p>
            {performance.ageRating && <p><span style={{ color: 'var(--muted-foreground)' }}>관람등급:</span> {performance.ageRating}</p>}
            {performance.runtime && <p><span style={{ color: 'var(--muted-foreground)' }}>러닝타임:</span> {performance.runtime}분</p>}
            {performance.intermission && <p><span style={{ color: 'var(--muted-foreground)' }}>인터미션:</span> {performance.intermission}분</p>}
            {performance.organizer && <p><span style={{ color: 'var(--muted-foreground)' }}>주최:</span> {performance.organizer}</p>}
          </div>
        </section>

        {/* 설명 */}
        {performance.description && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>설명</h2>
            <p className="text-sm whitespace-pre-wrap">{performance.description}</p>
          </section>
        )}

        {/* 장소 */}
        {performance.venue && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>장소</h2>
            <p className="text-sm">{performance.venue.name}</p>
            {performance.venue.address && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{performance.venue.address}</p>
            )}
          </section>
        )}

        {/* 회차 */}
        {performance.schedules.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>회차</h2>
            <div className="space-y-1">
              {performance.schedules.map((s) => (
                <p key={s.id} className="text-sm">{formatDateTime(s.dateTime)}</p>
              ))}
            </div>
          </section>
        )}

        {/* 티켓 */}
        {source?.tickets && source.tickets.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>가격</h2>
            <div className="space-y-1">
              {source.tickets.map((t) => (
                <p key={t.id} className="text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>{t.seatGrade}:</span> {t.price.toLocaleString()}원
                </p>
              ))}
            </div>
          </section>
        )}

        {/* 출처 */}
        {source && (
          <section className="p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>출처</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span style={{ color: 'var(--muted-foreground)' }}>플랫폼:</span> {platformLabels[source.platform] || source.platform}</p>
              {source.ticketOpenAt && (
                <p><span style={{ color: 'var(--muted-foreground)' }}>예매 오픈:</span> {formatDateTime(source.ticketOpenAt)}</p>
              )}
              <p className="col-span-2">
                <span style={{ color: 'var(--muted-foreground)' }}>URL:</span>{' '}
                <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{source.sourceUrl}</a>
              </p>
            </div>
          </section>
        )}

        {/* 아티스트 라인업 */}
        {performance.artists.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>아티스트 라인업</h2>
            <div className="space-y-2">
              {performance.artists.map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{a.artist?.name ?? a.stageName ?? 'Unknown'}</span>
                  {a.role && <span style={{ color: 'var(--muted-foreground)' }}>({a.role})</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/admin/src/app/performances/\\[id\\]/page.tsx
git commit -m "feat(admin): add performance detail page"
```

---

### Task 6: 수정 페이지

**Files:**
- Create: `apps/admin/src/app/performances/[id]/edit/page.tsx`

- [ ] **Step 1: 수정 페이지 생성**

`PerformanceForm`을 `mode='edit'`로 사용하고, 기존 데이터를 `initialData`로 전달한다.

```tsx
// apps/admin/src/app/performances/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PerformanceForm } from '../../components/performance-form';
import type { Performance } from '@ipchun/shared';

export default function EditPerformancePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.performances.get(id)
      .then(setPerformance)
      .catch(() => setError('공연 정보를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await api.performances.update(id, data);
    router.push(`/performances/${id}`);
  }

  if (loading) return <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!performance) return <div className="alert-error">공연을 찾을 수 없습니다</div>;

  return (
    <div>
      <h1 className="page-heading mb-8">공연 수정</h1>
      <PerformanceForm mode="edit" initialData={performance} onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter admin build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/src/app/performances/\\[id\\]/edit/page.tsx
git commit -m "feat(admin): add performance edit page"
```

---

### Task 7: 통합 확인

- [ ] **Step 1: 서버 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter server build`
Expected: 빌드 성공

- [ ] **Step 2: Admin 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter admin build`
Expected: 빌드 성공

- [ ] **Step 3: 전체 흐름 검증 (수동)**

1. `/performances` 목록에서 공연 카드 클릭 → 상세 페이지 이동 확인
2. 상세 페이지에서 "수정" 클릭 → 수정 폼에 데이터 pre-fill 확인
3. 수정 폼에서 제목 변경 후 저장 → 상세 페이지에서 변경사항 확인
4. 상세 페이지에서 "삭제" 클릭 → 확인 다이얼로그 → 삭제 후 목록으로 이동 확인
