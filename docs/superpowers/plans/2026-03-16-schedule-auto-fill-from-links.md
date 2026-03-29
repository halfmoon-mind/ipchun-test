# 링크로 일정 자동 등록 (Schedule Auto-Fill from Links) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인스타그램 포스트 URL이나 티켓 사이트 링크를 입력하면 일정 정보(제목, 날짜, 장소, 이미지 등)를 자동으로 추출하여 Admin 일정 등록 폼에 채워주는 기능 구현

**Architecture:** Admin Next.js API route에 범용 링크 스크래퍼를 추가한다. URL을 받으면 소스를 감지(Instagram, Interpark, Yes24 등)하고 사이트별 파서 또는 OG 태그 폴백으로 구조화된 일정 데이터를 반환한다. Admin 일정 등록 페이지 상단에 URL 입력 필드를 추가하여 Spotify 아티스트 자동 채우기와 동일한 UX를 제공한다.

**Tech Stack:** Next.js API Routes, fetch + regex HTML 파싱 (기존 Spotify 스크래핑 패턴), Instagram oEmbed API

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/admin/src/app/api/scrape-schedule/route.ts` | 범용 링크 스크래퍼 API route |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/og.ts` | OG 태그 기반 폴백 파서 |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts` | Instagram oEmbed + OG 파서 |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts` | Interpark Ticket 파서 |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/types.ts` | 공유 타입 정의 |
| Modify | `apps/admin/src/app/schedules/new/page.tsx` | URL 입력 + 자동 채우기 UI |
| Modify | `apps/admin/src/lib/api.ts` | scrapeSchedule API 메서드 추가 |

---

## Chunk 1: 스크래핑 API 기반 구조

### Task 1: 스크래핑 결과 타입 정의

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/types.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
export interface ScrapedSchedule {
  title: string | null;
  description: string | null;
  startDate: string | null;    // ISO 8601
  endDate: string | null;      // ISO 8601
  location: string | null;     // 장소명
  address: string | null;      // 주소
  imageUrl: string | null;     // 포스터/이미지
  sourceUrl: string;           // 원본 링크
  source: 'instagram' | 'interpark' | 'og' | 'unknown';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/types.ts
git commit -m "feat(admin): add scraped schedule type definition"
```

---

### Task 2: OG 태그 폴백 파서

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/og.ts`

- [ ] **Step 1: OG 파서 구현**

기존 Spotify 스크래핑(`apps/admin/src/app/api/spotify/route.ts`)의 fetch + regex 패턴을 따른다.

```typescript
import { ScrapedSchedule } from './types';

const BOT_USER_AGENT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** HTML에서 meta 태그 content 값을 추출하는 유틸 함수 */
export function extractMetaContent(html: string, property: string): string | null {
  // property="og:..." 또는 name="og:..." 둘 다 매칭
  const match = html.match(
    new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]*)"`, 'i'),
  );
  if (match) return match[1];
  // content가 먼저 오는 경우도 처리
  const match2 = html.match(
    new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:property|name)="${property}"`, 'i'),
  );
  return match2 ? match2[1] : null;
}

/** URL을 fetch하고 HTML을 반환하는 유틸 함수 */
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': BOT_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.text();
}

export async function parseOg(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  return {
    title: extractMetaContent(html, 'og:title'),
    description: extractMetaContent(html, 'og:description'),
    startDate: null,
    endDate: null,
    location: null,
    address: null,
    imageUrl: extractMetaContent(html, 'og:image'),
    sourceUrl: url,
    source: 'og',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/og.ts
git commit -m "feat(admin): add OG tag fallback parser for schedule scraping"
```

---

### Task 3: Instagram 파서

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts`

- [ ] **Step 1: Instagram 파서 구현**

Instagram oEmbed API(`https://api.instagram.com/oembed?url=...`)를 우선 시도하고, 실패 시 OG 폴백.

```typescript
import { ScrapedSchedule } from './types';
import { parseOg } from './og';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export function isInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\//.test(url);
}

export async function parseInstagram(url: string): Promise<ScrapedSchedule> {
  // 1. oEmbed API 시도
  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);

    if (res.ok) {
      const data: OEmbedResponse = await res.json();
      return {
        title: data.title || null,
        description: data.title || null,
        startDate: null,
        endDate: null,
        location: null,
        address: null,
        imageUrl: data.thumbnail_url || null,
        sourceUrl: url,
        source: 'instagram',
      };
    }
  } catch {
    // oEmbed 실패 시 OG 폴백
  }

  // 2. OG 태그 폴백
  const result = await parseOg(url);
  return { ...result, source: 'instagram' };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts
git commit -m "feat(admin): add Instagram parser with oEmbed + OG fallback"
```

---

### Task 4: Interpark Ticket 파서

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts`

- [ ] **Step 1: Interpark 파서 구현**

Interpark Ticket 페이지에서 JSON-LD, OG 태그, 메타 정보를 추출한다.

```typescript
import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

export function isInterparkUrl(url: string): boolean {
  return /^https?:\/\/(tickets\.)?interpark\.com\/goods\//.test(url);
}

export async function parseInterpark(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // OG 태그 추출 (og.ts의 유틸 재사용)
  let title = extractMetaContent(html, 'og:title');
  const description = extractMetaContent(html, 'og:description');
  const imageUrl = extractMetaContent(html, 'og:image');

  // JSON-LD에서 이벤트 정보 추출 시도
  let startDate: string | null = null;
  let endDate: string | null = null;
  let location: string | null = null;
  let address: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(match[1]);
      if (jsonLd['@type'] === 'Event' || jsonLd['@type'] === 'MusicEvent') {
        title = title || jsonLd.name || null;
        startDate = jsonLd.startDate || null;
        endDate = jsonLd.endDate || null;
        if (jsonLd.location) {
          location = jsonLd.location.name || null;
          address = jsonLd.location.address?.streetAddress
            || jsonLd.location.address
            || null;
          if (typeof address === 'object') address = null;
        }
        break;
      }
    } catch {
      // JSON 파싱 실패 무시
    }
  }

  return {
    title,
    description,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    sourceUrl: url,
    source: 'interpark',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts
git commit -m "feat(admin): add Interpark Ticket parser for schedule scraping"
```

---

### Task 5: 메인 스크래퍼 API Route

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/route.ts`

- [ ] **Step 1: API route 구현**

URL을 받아 소스를 감지하고 적절한 파서를 호출하는 라우터.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isInstagramUrl, parseInstagram } from './parsers/instagram';
import { isInterparkUrl, parseInterpark } from './parsers/interpark';
import { parseOg } from './parsers/og';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // URL 유효성 간단 검증
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    let result;

    if (isInstagramUrl(url)) {
      result = await parseInstagram(url);
    } else if (isInterparkUrl(url)) {
      result = await parseInterpark(url);
    } else {
      // 범용 OG 폴백
      result = await parseOg(url);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to scrape URL' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: 수동 테스트**

```bash
cd apps/admin && pnpm dev
# 브라우저에서: http://localhost:3001/api/scrape-schedule?url=https://tickets.interpark.com/goods/25001234
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/route.ts
git commit -m "feat(admin): add scrape-schedule API route with source detection"
```

---

## Chunk 2: Admin UI 통합

### Task 6: Admin API 클라이언트에 scrapeSchedule 메서드 추가

**Files:**
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: api 객체에 scrapeSchedule 추가**

기존 `api.spotify.getArtist()` 패턴을 따른다.

`api.ts`의 export 객체에 다음을 추가:

```typescript
import type { ScrapedSchedule } from '@/app/api/scrape-schedule/parsers/types';

// api 객체 안에 추가:
scrape: {
  schedule: async (url: string): Promise<ScrapedSchedule> => {
    const res = await fetch(
      `/api/scrape-schedule?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Scrape failed: ${res.status}`);
    }
    return res.json();
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat(admin): add scrapeSchedule method to API client"
```

---

### Task 7: 일정 등록 페이지에 URL 자동 채우기 UI 추가

**Files:**
- Modify: `apps/admin/src/app/schedules/new/page.tsx`

- [ ] **Step 1: URL 입력 섹션 + 자동 채우기 로직 추가**

기존 아티스트 등록 페이지의 Spotify URL 자동 채우기와 동일한 UX 패턴을 적용한다.

페이지 상단에 URL 입력 + "자동 채우기" 버튼을 추가하고, 스크래핑 결과로 폼 필드를 채운다.

주요 변경:
1. `useState` 훅으로 각 폼 필드 상태 관리 (기존 uncontrolled → controlled로 전환)
2. URL 입력 섹션 추가 (폼 위쪽, 구분선으로 분리)
3. 자동 채우기 시 빈 필드만 채움 (이미 입력된 값은 유지)

```tsx
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
  const [artistId, setArtistId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

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
      await api.schedules.create({
        artistId,
        title,
        type,
        startDate,
        endDate: endDate || null,
        location: location || null,
        address: address || null,
        description: description || null,
        imageUrl: imageUrl || null,
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
          <label className="form-label">아티스트 ID *</label>
          <input
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            required
            className="form-input"
            placeholder="아티스트 목록 페이지에서 ID 확인 (UUID 형식)"
          />
        </div>

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

        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 수동 테스트**

Admin 앱 실행 후 `/schedules/new`에서:
1. 인스타그램 링크 입력 → "자동 채우기" 클릭 → 제목/설명/이미지 채워지는지 확인
2. 인터파크 티켓 링크 → 제목/날짜/장소까지 채워지는지 확인
3. 이미 입력된 필드가 덮어쓰기 되지 않는지 확인

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/schedules/new/page.tsx
git commit -m "feat(admin): add URL auto-fill to schedule creation page"
```

---

## 확장 가능성 (향후)

이 구조로 새로운 티켓 사이트 파서를 추가하기 쉬움:
1. `parsers/` 폴더에 새 파서 파일 생성 (예: `yes24.ts`, `melon-ticket.ts`)
2. `isXxxUrl()` + `parseXxx()` 패턴 구현
3. `route.ts`의 if-else 체인에 추가

추가 고려사항:
- **이미지 호스팅**: 현재는 외부 URL을 직접 참조함. 추후 S3 등에 업로드하여 안정적으로 호스팅 가능
- **아티스트 자동 매칭**: 스크래핑된 데이터에서 아티스트 이름을 추출하여 DB 검색 후 자동 매칭
