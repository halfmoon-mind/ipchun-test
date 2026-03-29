# 공연 등록 (Performance Registration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin이 멜론/NOL/티켓링크 URL을 붙여넣으면 플랫폼 API로 공연 데이터를 자동 수집하고, 통합 데이터 모델(Performance)로 저장하는 공연 등록 기능 구현

**Architecture:** 서버 사이드에 플랫폼별 fetcher를 구현하여 URL 입력 시 데이터를 수집·정규화한다. Admin은 fetch된 데이터를 프리뷰 후 수정·확인하여 저장한다. Performance 모델은 기존 Schedule 모델과 별개로 운영하며, PerformanceSource로 멀티 플랫폼 출처를 추적한다.

**Tech Stack:** Prisma 7 (schema), NestJS 11 (server module), Next.js 16 (admin), TypeScript 5, native fetch (외부 API 호출)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/server/src/performance/performance.module.ts` | NestJS module 등록 |
| `apps/server/src/performance/performance.controller.ts` | REST endpoints (fetch, CRUD) |
| `apps/server/src/performance/performance.service.ts` | 비즈니스 로직 (create, list, fetch 오케스트레이션) |
| `apps/server/src/performance/dto/create-performance.dto.ts` | 생성 DTO (class-validator) |
| `apps/server/src/performance/dto/fetch-url.dto.ts` | URL 입력 DTO |
| `apps/server/src/performance/fetchers/url-parser.ts` | URL → platform + externalId 파싱 |
| `apps/server/src/performance/fetchers/nol.fetcher.ts` | NOL(인터파크) REST API fetcher |
| `apps/server/src/performance/fetchers/melon.fetcher.ts` | 멜론 티켓 HTML fetcher |
| `apps/server/src/performance/fetchers/ticketlink.fetcher.ts` | 티켓링크 JSON-LD + MAPI fetcher |
| `apps/admin/src/app/performances/page.tsx` | 공연 목록 페이지 |
| `apps/admin/src/app/performances/new/page.tsx` | 공연 등록 페이지 |

### Modified Files
| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | 새 모델 6개 + enum 3개 추가 |
| `apps/server/src/app.module.ts` | PerformanceModule import |
| `packages/shared/src/index.ts` | 새 enum/interface export |
| `apps/admin/src/lib/api.ts` | performances API 메서드 추가 |
| `apps/admin/src/app/layout.tsx` | 사이드바에 "공연" 네비게이션 추가 |

---

### Task 1: Prisma Schema — 새 Enum & Model 추가

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 새 enum 추가**

`schema.prisma` 파일 끝에 (기존 `ScheduleType` enum 뒤에) 다음 enum들을 추가:

```prisma
enum Genre {
  CONCERT
  MUSICAL
  PLAY
  CLASSIC
  FESTIVAL
  OTHER
}

enum PerformanceStatus {
  SCHEDULED
  ON_SALE
  SOLD_OUT
  COMPLETED
  CANCELLED
}

enum TicketPlatform {
  MELON
  NOL
  TICKETLINK
}
```

- [ ] **Step 2: Venue 모델 추가**

```prisma
model Venue {
  id           String        @id @default(uuid())
  name         String        @unique
  address      String?
  latitude     Float?
  longitude    Float?
  phone        String?
  website      String?
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  performances Performance[]

  @@map("venues")
}
```

- [ ] **Step 3: Performance, PerformanceSource, PerformanceSchedule, PerformanceArtist, Ticket 모델 추가**

```prisma
model Performance {
  id           String              @id @default(uuid())
  title        String
  subtitle     String?
  genre        Genre               @default(CONCERT)
  ageRating    String?             @map("age_rating")
  runtime      Int?
  intermission Int?
  posterUrl    String?             @map("poster_url")
  status       PerformanceStatus   @default(SCHEDULED)
  venueId      String?             @map("venue_id")
  venue        Venue?              @relation(fields: [venueId], references: [id])
  organizer    String?
  createdAt    DateTime            @default(now()) @map("created_at")
  updatedAt    DateTime            @updatedAt @map("updated_at")
  sources      PerformanceSource[]
  schedules    PerformanceSchedule[]
  artists      PerformanceArtist[]

  @@map("performances")
}

model PerformanceSource {
  id            String         @id @default(uuid())
  performanceId String         @map("performance_id")
  performance   Performance    @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  platform      TicketPlatform
  externalId    String         @map("external_id")
  sourceUrl     String         @map("source_url")
  ticketOpenAt  DateTime?      @map("ticket_open_at")
  bookingEndAt  DateTime?      @map("booking_end_at")
  salesStatus   String?        @map("sales_status")
  rawData       Json?          @map("raw_data")
  lastSyncedAt  DateTime       @default(now()) @map("last_synced_at")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  tickets       Ticket[]

  @@unique([platform, externalId])
  @@map("performance_sources")
}

model PerformanceSchedule {
  id            String      @id @default(uuid())
  performanceId String      @map("performance_id")
  performance   Performance @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  dateTime      DateTime    @map("date_time")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@unique([performanceId, dateTime])
  @@map("performance_schedules")
}

model PerformanceArtist {
  id            String      @id @default(uuid())
  performanceId String      @map("performance_id")
  performance   Performance @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  artistId      String      @map("artist_id")
  artist        Artist      @relation(fields: [artistId], references: [id], onDelete: Cascade)
  role          String?
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@unique([performanceId, artistId])
  @@map("performance_artists")
}

model Ticket {
  id        String            @id @default(uuid())
  sourceId  String            @map("source_id")
  source    PerformanceSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  seatGrade String            @map("seat_grade")
  price     Int
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  @@map("tickets")
}
```

- [ ] **Step 4: Artist 모델에 relation 필드 추가**

기존 Artist 모델의 `lineups` 필드 아래에 추가:

```prisma
  performanceArtists PerformanceArtist[]
```

- [ ] **Step 5: 마이그레이션 실행**

Run: `cd apps/server && npx prisma migrate dev --name add-performance-models`
Expected: Migration 성공, 새 테이블 6개 생성 (venues, performances, performance_sources, performance_schedules, performance_artists, tickets)

- [ ] **Step 6: Prisma 클라이언트 생성 확인**

Run: `cd apps/server && npx prisma generate`
Expected: `Generated Prisma Client` 메시지

- [ ] **Step 7: 커밋**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "$(cat <<'EOF'
[db] Performance 관련 모델 추가

Venue, Performance, PerformanceSource, PerformanceSchedule,
PerformanceArtist, Ticket 모델 및 Genre, PerformanceStatus,
TicketPlatform enum 추가
EOF
)"
```

---

### Task 2: Shared Types — 새 Enum & Interface

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 새 enum 추가**

`packages/shared/src/index.ts`에서 기존 `CardNewsStatus` enum 뒤에 추가:

```typescript
export enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
  OTHER = 'OTHER',
}

export enum PerformanceStatus {
  SCHEDULED = 'SCHEDULED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPlatform {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
}
```

- [ ] **Step 2: 새 interface 추가**

파일 끝에 추가:

```typescript
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Performance {
  id: string;
  title: string;
  subtitle: string | null;
  genre: Genre;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  status: PerformanceStatus;
  venueId: string | null;
  venue: Venue | null;
  organizer: string | null;
  sources: PerformanceSourceItem[];
  schedules: PerformanceScheduleItem[];
  artists: PerformanceArtistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceSourceItem {
  id: string;
  platform: TicketPlatform;
  externalId: string;
  sourceUrl: string;
  ticketOpenAt: string | null;
  bookingEndAt: string | null;
  salesStatus: string | null;
  lastSyncedAt: string;
  tickets: TicketItem[];
}

export interface PerformanceScheduleItem {
  id: string;
  dateTime: string;
}

export interface PerformanceArtistItem {
  id: string;
  artistId: string;
  artist?: Artist;
  role: string | null;
}

export interface TicketItem {
  id: string;
  seatGrade: string;
  price: number;
}

/** 플랫폼에서 fetch한 결과 (프리뷰용, DB 저장 전) */
export interface FetchedPerformance {
  title: string;
  subtitle: string | null;
  genre: Genre;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  venue: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  organizer: string | null;
  schedules: Array<{ dateTime: string }>;
  tickets: Array<{ seatGrade: string; price: number }>;
  source: {
    platform: TicketPlatform;
    externalId: string;
    sourceUrl: string;
    ticketOpenAt: string | null;
    bookingEndAt: string | null;
    salesStatus: string | null;
  };
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && pnpm build` (또는 `npx tsc --noEmit`)
Expected: 타입 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/index.ts
git commit -m "[shared] Performance 관련 타입 및 FetchedPerformance 인터페이스 추가"
```

---

### Task 3: Server — URL Parser

**Files:**
- Create: `apps/server/src/performance/fetchers/url-parser.ts`

- [ ] **Step 1: URL 파서 구현**

```typescript
// apps/server/src/performance/fetchers/url-parser.ts

export enum TicketPlatformEnum {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
}

export interface ParsedTicketUrl {
  platform: TicketPlatformEnum;
  externalId: string;
  sourceUrl: string;
}

export function parseTicketUrl(url: string): ParsedTicketUrl {
  // 멜론 티켓: ticket.melon.com/performance/index.htm?prodId={id}
  const melonMatch = url.match(
    /ticket\.melon\.com\/performance\/.*[?&]prodId=(\d+)/,
  );
  if (melonMatch) {
    return {
      platform: TicketPlatformEnum.MELON,
      externalId: melonMatch[1],
      sourceUrl: url,
    };
  }

  // NOL (인터파크): tickets.interpark.com/goods/{id}
  const nolMatch = url.match(
    /(?:tickets?\.)?interpark\.com\/(?:goods|ticket)\/(\d+)/,
  );
  if (nolMatch) {
    return {
      platform: TicketPlatformEnum.NOL,
      externalId: nolMatch[1],
      sourceUrl: url,
    };
  }

  // 티켓링크: ticketlink.co.kr/product/{id}
  const ticketlinkMatch = url.match(/ticketlink\.co\.kr\/product\/(\d+)/);
  if (ticketlinkMatch) {
    return {
      platform: TicketPlatformEnum.TICKETLINK,
      externalId: ticketlinkMatch[1],
      sourceUrl: url,
    };
  }

  throw new Error(`지원하지 않는 URL 형식입니다: ${url}`);
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/server/src/performance/fetchers/url-parser.ts
git commit -m "[feature] 티켓 URL 파서 구현 (멜론/NOL/티켓링크)"
```

---

### Task 4: Server — NOL (인터파크) Fetcher

**Files:**
- Create: `apps/server/src/performance/fetchers/nol.fetcher.ts`

- [ ] **Step 1: NOL fetcher 구현**

```typescript
// apps/server/src/performance/fetchers/nol.fetcher.ts

import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

const NOL_API = 'https://api-ticketfront.interpark.com';

function buildHeaders(goodsId: string): Record<string, string> {
  return {
    Referer: `https://tickets.interpark.com/goods/${goodsId}`,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    Accept: 'application/json',
  };
}

/** "20260919" 또는 "202603112000" → ISO 문자열 */
function parseNolDate(s: string | null | undefined): string | null {
  if (!s || s.length < 8) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  const h = s.length >= 10 ? s.slice(8, 10) : '00';
  const min = s.length >= 12 ? s.slice(10, 12) : '00';
  return `${y}-${m}-${d}T${h}:${min}:00+09:00`;
}

const GENRE_MAP: Record<string, Genre> = {
  콘서트: Genre.CONCERT,
  뮤지컬: Genre.MUSICAL,
  연극: Genre.PLAY,
  클래식: Genre.CLASSIC,
  페스티벌: Genre.FESTIVAL,
};

export async function fetchFromNol(
  externalId: string,
): Promise<FetchedPerformance> {
  const headers = buildHeaders(externalId);

  // 1) Summary — 핵심 데이터
  const summaryRes = await fetch(
    `${NOL_API}/v1/goods/${externalId}/summary`,
    { headers },
  );
  if (!summaryRes.ok) {
    throw new Error(`NOL summary API 실패: ${summaryRes.status}`);
  }
  const summary = await summaryRes.json();

  // 2) Prices — 좌석등급별 가격
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  try {
    const pricesRes = await fetch(
      `${NOL_API}/v1/goods/${externalId}/prices/group`,
      { headers },
    );
    if (pricesRes.ok) {
      const pricesData = await pricesRes.json();
      for (const [gradeName, gradeInfo] of Object.entries(pricesData)) {
        const items = (gradeInfo as Record<string, unknown[]>)['기본가'];
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0] as { salesPrice?: number };
          if (first.salesPrice) {
            tickets.push({ seatGrade: gradeName, price: first.salesPrice });
          }
        }
      }
    }
  } catch {
    /* 가격 정보 실패 시 무시 */
  }

  // 3) Place — 공연장 상세
  let venue: FetchedPerformance['venue'] = null;
  if (summary.placeCode) {
    try {
      const placeRes = await fetch(
        `${NOL_API}/v1/Place/${summary.placeCode}`,
        { headers },
      );
      if (placeRes.ok) {
        const place = await placeRes.json();
        venue = {
          name: place.placeName || summary.placeName,
          address: place.placeAddress || null,
          latitude: place.latitude ? parseFloat(place.latitude) : null,
          longitude: place.longitude ? parseFloat(place.longitude) : null,
        };
      }
    } catch {
      /* Place API 실패 시 fallback */
    }
  }
  if (!venue && summary.placeName) {
    venue = {
      name: summary.placeName,
      address: null,
      latitude: null,
      longitude: null,
    };
  }

  // 4) 회차 스케줄
  const schedules: Array<{ dateTime: string }> = [];
  try {
    const seqRes = await fetch(
      `${NOL_API}/v1/goods/${externalId}/playSeq`,
      { headers },
    );
    if (seqRes.ok) {
      const seqData = await seqRes.json();
      if (Array.isArray(seqData)) {
        for (const seq of seqData) {
          const dt = seq.playDate || seq.playDateTime;
          if (dt) {
            const parsed = parseNolDate(String(dt).replace(/\D/g, ''));
            if (parsed) schedules.push({ dateTime: parsed });
          }
        }
      }
    }
  } catch {
    /* playSeq 실패 시 날짜 범위로 fallback */
  }

  // Fallback: startDate/endDate
  if (schedules.length === 0) {
    const start = parseNolDate(summary.playStartDate);
    if (start) {
      schedules.push({ dateTime: start });
      const end = parseNolDate(summary.playEndDate);
      if (end && end !== start) {
        schedules.push({ dateTime: end });
      }
    }
  }

  // 포스터 URL 정규화
  let posterUrl: string | null = summary.goodsLargeImageUrl || null;
  if (posterUrl && posterUrl.startsWith('//')) {
    posterUrl = `https:${posterUrl}`;
  }

  return {
    title: summary.goodsName || '',
    subtitle: null,
    genre: GENRE_MAP[summary.genreName] || Genre.OTHER,
    ageRating: summary.viewRateName || null,
    runtime: summary.runningTime || null,
    intermission: summary.interMissionTime || null,
    posterUrl,
    venue,
    organizer: summary.bizInfo || null,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.NOL,
      externalId,
      sourceUrl: `https://tickets.interpark.com/goods/${externalId}`,
      ticketOpenAt: parseNolDate(summary.ticketOpenDate),
      bookingEndAt: parseNolDate(summary.bookingEndDate),
      salesStatus: summary.goodsStatus || null,
    },
  };
}
```

- [ ] **Step 2: 수동 테스트**

Run: `cd apps/server && npx ts-node -e "import('./src/performance/fetchers/nol.fetcher').then(m => m.fetchFromNol('26003199').then(r => console.log(JSON.stringify(r, null, 2))))"`
Expected: Vaundy 공연 데이터 JSON 출력 (title, venue, tickets, schedules 필드 포함)

> ts-node 실행 환경이 안 되면 나중에 컨트롤러 연결 후 API로 테스트해도 된다.

- [ ] **Step 3: 커밋**

```bash
git add apps/server/src/performance/fetchers/nol.fetcher.ts
git commit -m "[feature] NOL(인터파크) fetcher — summary, prices, place API 연동"
```

---

### Task 5: Server — 멜론 티켓 Fetcher

**Files:**
- Create: `apps/server/src/performance/fetchers/melon.fetcher.ts`

- [ ] **Step 1: 멜론 fetcher 구현**

```typescript
// apps/server/src/performance/fetchers/melon.fetcher.ts

import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

/** "2026.02.27" → "2026-02-27" */
function koreanDateToIso(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function fetchFromMelon(
  externalId: string,
): Promise<FetchedPerformance> {
  const sourceUrl = `https://ticket.melon.com/performance/index.htm?prodId=${externalId}`;

  const res = await fetch(sourceUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`멜론 티켓 페이지 요청 실패: ${res.status}`);
  const html = await res.text();

  // 제목: <p class="tit">...</p>
  let title = '';
  const titleMatch = html.match(
    /<(?:p class="tit"|h2 class="tit")\s*>([\s\S]*?)<\/(?:p|h2)>/,
  );
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // 부제: <p class="sub_tit">...</p>
  let subtitle: string | null = null;
  const subMatch = html.match(/<p class="sub_tit">([\s\S]*?)<\/p>/);
  if (subMatch) {
    subtitle = subMatch[1].replace(/<[^>]*>/g, '').trim() || null;
  }

  // 공연기간: "2026.02.27 - 2026.02.27" 또는 "2026.02.27 ~ 2026.02.27"
  let startDate: string | null = null;
  let endDate: string | null = null;
  const dateMatch = html.match(
    /(\d{4}\.\d{2}\.\d{2})\s*[-~]\s*(\d{4}\.\d{2}\.\d{2})/,
  );
  if (dateMatch) {
    startDate = koreanDateToIso(dateMatch[1]);
    endDate = koreanDateToIso(dateMatch[2]);
  }

  // 공연장: <a ... title="공연장명" ...>
  let venueName: string | null = null;
  const venueMatch = html.match(
    /<a[^>]*href="javascript[^"]*"[^>]*title="([^"]*)"[^>]*>/,
  );
  if (venueMatch) venueName = venueMatch[1].trim();

  // 주소
  let address: string | null = null;
  const addrMatch = html.match(
    /<p[^>]*>\s*((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^<]{5,80})\s*<\/p>/,
  );
  if (addrMatch) address = addrMatch[1].trim();

  // 포스터 이미지
  let posterUrl: string | null = null;
  const imgMatch = html.match(
    /<img[^>]*src="(https?:\/\/cdnticket\.melon\.co\.kr\/[^"]+)"/,
  );
  if (imgMatch) posterUrl = imgMatch[1];

  // 러닝타임: "120분" 패턴 (공연시간 컨텍스트 내에서)
  let runtime: number | null = null;
  const runtimeMatch = html.match(/공연\s*시간[^<]*?(\d+)\s*분/);
  if (runtimeMatch) runtime = parseInt(runtimeMatch[1]);

  // 관람등급
  let ageRating: string | null = null;
  const ageMatch = html.match(/(전체\s*관람가|만\s*\d+세\s*이상)/);
  if (ageMatch) ageRating = ageMatch[1].replace(/\s+/g, ' ');

  // 가격: "R석 110,000원" 패턴
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  const priceMatches = html.matchAll(
    /([가-힣A-Za-z]+석)\s*[:\s]*(\d[\d,]+)\s*원/g,
  );
  for (const pm of priceMatches) {
    const price = parseInt(pm[2].replace(/,/g, ''));
    if (price > 0) {
      tickets.push({ seatGrade: pm[1], price });
    }
  }
  // 단일 가격: "전석 110,000원"
  if (tickets.length === 0) {
    const singlePrice = html.match(/전석\s*(\d[\d,]+)\s*원/);
    if (singlePrice) {
      tickets.push({
        seatGrade: '전석',
        price: parseInt(singlePrice[1].replace(/,/g, '')),
      });
    }
  }

  // 주최/주관
  let organizer: string | null = null;
  const orgMatch = html.match(
    /(?:주최|기획)[^<]*?<[^>]*>\s*([^<]+)/,
  );
  if (orgMatch) organizer = orgMatch[1].trim();

  // 회차: 공연일시 텍스트에서 날짜+시간 파싱
  const schedules: Array<{ dateTime: string }> = [];
  // 멜론은 정확한 회차 정보를 텍스트로 제공 — 파싱이 어려우므로 startDate/endDate 활용
  if (startDate) {
    schedules.push({ dateTime: `${startDate}T00:00:00+09:00` });
    if (endDate && endDate !== startDate) {
      schedules.push({ dateTime: `${endDate}T00:00:00+09:00` });
    }
  }

  // 예매 오픈일
  let ticketOpenAt: string | null = null;
  const openMatch = html.match(
    /(?:예매|티켓)\s*(?:오픈|시작)[^<]*?(\d{4}\.\d{2}\.\d{2})[^<]*?(\d{1,2}:\d{2})?/,
  );
  if (openMatch) {
    const d = koreanDateToIso(openMatch[1]);
    const t = openMatch[2] || '00:00';
    if (d) ticketOpenAt = `${d}T${t}:00+09:00`;
  }

  return {
    title,
    subtitle,
    genre: Genre.CONCERT,
    ageRating,
    runtime,
    intermission: null,
    posterUrl,
    venue: venueName
      ? { name: venueName, address, latitude: null, longitude: null }
      : null,
    organizer,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.MELON,
      externalId,
      sourceUrl,
      ticketOpenAt,
      bookingEndAt: null,
      salesStatus: null,
    },
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/server/src/performance/fetchers/melon.fetcher.ts
git commit -m "[feature] 멜론 티켓 fetcher — HTML 파싱 기반 데이터 추출"
```

---

### Task 6: Server — 티켓링크 Fetcher

**Files:**
- Create: `apps/server/src/performance/fetchers/ticketlink.fetcher.ts`

- [ ] **Step 1: 티켓링크 fetcher 구현**

```typescript
// apps/server/src/performance/fetchers/ticketlink.fetcher.ts

import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

const MAPI = 'https://mapi.ticketlink.co.kr/mapi';

export async function fetchFromTicketlink(
  externalId: string,
): Promise<FetchedPerformance> {
  const pageUrl = `https://www.ticketlink.co.kr/product/${externalId}`;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };

  // ── Layer 1: JSON-LD 파싱 ──
  const htmlRes = await fetch(pageUrl, {
    headers: { ...headers, Accept: 'text/html' },
  });
  if (!htmlRes.ok) {
    throw new Error(`티켓링크 페이지 요청 실패: ${htmlRes.status}`);
  }
  const html = await htmlRes.text();

  let title = '';
  let startDate: string | null = null;
  let endDate: string | null = null;
  let venueName: string | null = null;
  let venueAddress: string | null = null;
  let posterUrl: string | null = null;
  let organizer: string | null = null;
  let representativePrice: number | null = null;
  let salesStatus: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld['@type'] !== 'Event' && ld['@type'] !== 'MusicEvent') continue;

      title = ld.name || '';
      startDate = ld.startDate || null;
      endDate = ld.endDate || null;
      posterUrl = ld.image || null;

      if (ld.location) {
        venueName = ld.location.name || null;
        venueAddress =
          typeof ld.location.address === 'string'
            ? ld.location.address
            : ld.location.address?.streetAddress || null;
      }
      if (ld.organizer) {
        organizer =
          typeof ld.organizer === 'string'
            ? ld.organizer
            : ld.organizer.name || null;
      }
      if (ld.offers?.price) {
        representativePrice = parseInt(ld.offers.price);
      }
      if (ld.offers?.availability) {
        salesStatus = ld.offers.availability.includes('InStock')
          ? 'ON_SALE'
          : 'SOLD_OUT';
      }
      break;
    } catch {
      /* JSON-LD 파싱 실패 무시 */
    }
  }

  // "|티켓링크" 접미사 제거
  title = title.replace(/\s*\|\s*티켓링크$/, '');

  // ── Layer 2: MAPI — 회차 날짜+시각 ──
  const schedules: Array<{ dateTime: string }> = [];
  try {
    const datesRes = await fetch(
      `${MAPI}/product/${externalId}/datesByUtc`,
      { headers: { ...headers, Accept: 'application/json' } },
    );
    if (datesRes.ok) {
      const datesData = await datesRes.json();
      if (datesData.data && Array.isArray(datesData.data)) {
        for (const item of datesData.data) {
          if (item.productDate) {
            const dt = new Date(item.productDate);
            schedules.push({ dateTime: dt.toISOString() });
          }
        }
      }
    }
  } catch {
    /* MAPI 실패 시 JSON-LD 날짜로 fallback */
  }

  // Fallback: JSON-LD 날짜
  if (schedules.length === 0 && startDate) {
    schedules.push({ dateTime: new Date(startDate).toISOString() });
    if (endDate && endDate !== startDate) {
      schedules.push({ dateTime: new Date(endDate).toISOString() });
    }
  }

  // 티켓 가격
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  if (representativePrice && representativePrice > 0) {
    tickets.push({ seatGrade: '일반', price: representativePrice });
  }

  return {
    title,
    subtitle: null,
    genre: Genre.CONCERT,
    ageRating: null,
    runtime: null,
    intermission: null,
    posterUrl,
    venue: venueName
      ? {
          name: venueName,
          address: venueAddress,
          latitude: null,
          longitude: null,
        }
      : null,
    organizer,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.TICKETLINK,
      externalId,
      sourceUrl: pageUrl,
      ticketOpenAt: null,
      bookingEndAt: null,
      salesStatus,
    },
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/server/src/performance/fetchers/ticketlink.fetcher.ts
git commit -m "[feature] 티켓링크 fetcher — JSON-LD + MAPI datesByUtc 연동"
```

---

### Task 7: Server — Performance Module (DTO + Service + Controller + Module)

**Files:**
- Create: `apps/server/src/performance/dto/fetch-url.dto.ts`
- Create: `apps/server/src/performance/dto/create-performance.dto.ts`
- Create: `apps/server/src/performance/performance.service.ts`
- Create: `apps/server/src/performance/performance.controller.ts`
- Create: `apps/server/src/performance/performance.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: FetchUrlDto 작성**

```typescript
// apps/server/src/performance/dto/fetch-url.dto.ts

import { IsString, IsUrl } from 'class-validator';

export class FetchUrlDto {
  @IsString()
  @IsUrl()
  url!: string;
}
```

- [ ] **Step 2: CreatePerformanceDto 작성**

```typescript
// apps/server/src/performance/dto/create-performance.dto.ts

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// DTO 전용 enum (Prisma enum과 값 동일)
enum Genre {
  CONCERT = 'CONCERT',
  MUSICAL = 'MUSICAL',
  PLAY = 'PLAY',
  CLASSIC = 'CLASSIC',
  FESTIVAL = 'FESTIVAL',
  OTHER = 'OTHER',
}

enum PerformanceStatus {
  SCHEDULED = 'SCHEDULED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

enum TicketPlatform {
  MELON = 'MELON',
  NOL = 'NOL',
  TICKETLINK = 'TICKETLINK',
}

export class ScheduleEntryDto {
  @IsDateString()
  dateTime!: string;
}

export class TicketEntryDto {
  @IsString()
  @IsNotEmpty()
  seatGrade!: string;

  @IsInt()
  price!: number;
}

export class CreatePerformanceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ enum: Genre, enumName: 'Genre' })
  @IsEnum(Genre)
  genre!: Genre;

  @IsString()
  @IsOptional()
  ageRating?: string;

  @IsInt()
  @IsOptional()
  runtime?: number;

  @IsInt()
  @IsOptional()
  intermission?: number;

  @IsString()
  @IsOptional()
  posterUrl?: string;

  @ApiProperty({ enum: PerformanceStatus, enumName: 'PerformanceStatus' })
  @IsEnum(PerformanceStatus)
  @IsOptional()
  status?: PerformanceStatus;

  @IsString()
  @IsOptional()
  organizer?: string;

  // ── Venue ──
  @IsString()
  @IsOptional()
  venueName?: string;

  @IsString()
  @IsOptional()
  venueAddress?: string;

  @IsNumber()
  @IsOptional()
  venueLatitude?: number;

  @IsNumber()
  @IsOptional()
  venueLongitude?: number;

  // ── Source ──
  @ApiProperty({ enum: TicketPlatform, enumName: 'TicketPlatform' })
  @IsEnum(TicketPlatform)
  platform!: TicketPlatform;

  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsString()
  @IsNotEmpty()
  sourceUrl!: string;

  @IsDateString()
  @IsOptional()
  ticketOpenAt?: string;

  @IsDateString()
  @IsOptional()
  bookingEndAt?: string;

  @IsString()
  @IsOptional()
  salesStatus?: string;

  // ── Schedules ──
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  @IsOptional()
  schedules?: ScheduleEntryDto[];

  // ── Tickets ──
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketEntryDto)
  @IsOptional()
  tickets?: TicketEntryDto[];
}
```

- [ ] **Step 3: PerformanceService 작성**

```typescript
// apps/server/src/performance/performance.service.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { parseTicketUrl } from './fetchers/url-parser';
import { fetchFromNol } from './fetchers/nol.fetcher';
import { fetchFromMelon } from './fetchers/melon.fetcher';
import { fetchFromTicketlink } from './fetchers/ticketlink.fetcher';
import type { FetchedPerformance } from '@ipchun/shared';

const PERFORMANCE_INCLUDE = {
  venue: true,
  sources: {
    include: { tickets: true },
  },
  schedules: {
    orderBy: { dateTime: 'asc' as const },
  },
  artists: {
    include: { artist: true },
  },
};

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchFromUrl(url: string): Promise<FetchedPerformance> {
    const { platform, externalId } = parseTicketUrl(url);

    // 중복 체크
    const existing = await this.prisma.performanceSource.findUnique({
      where: { platform_externalId: { platform, externalId } },
      include: { performance: true },
    });
    if (existing) {
      throw new ConflictException(
        `이미 등록된 공연입니다: "${existing.performance.title}" (${platform} ${externalId})`,
      );
    }

    switch (platform) {
      case 'NOL':
        return fetchFromNol(externalId);
      case 'MELON':
        return fetchFromMelon(externalId);
      case 'TICKETLINK':
        return fetchFromTicketlink(externalId);
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
  }

  async create(dto: CreatePerformanceDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Venue — findOrCreate
      let venueId: string | null = null;
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
      }

      // 2) Performance
      const performance = await tx.performance.create({
        data: {
          title: dto.title,
          subtitle: dto.subtitle ?? null,
          genre: dto.genre,
          ageRating: dto.ageRating ?? null,
          runtime: dto.runtime ?? null,
          intermission: dto.intermission ?? null,
          posterUrl: dto.posterUrl ?? null,
          status: dto.status ?? 'SCHEDULED',
          venueId,
          organizer: dto.organizer ?? null,
        },
      });

      // 3) PerformanceSource
      const source = await tx.performanceSource.create({
        data: {
          performanceId: performance.id,
          platform: dto.platform,
          externalId: dto.externalId,
          sourceUrl: dto.sourceUrl,
          ticketOpenAt: dto.ticketOpenAt ? new Date(dto.ticketOpenAt) : null,
          bookingEndAt: dto.bookingEndAt ? new Date(dto.bookingEndAt) : null,
          salesStatus: dto.salesStatus ?? null,
        },
      });

      // 4) Schedules
      if (dto.schedules && dto.schedules.length > 0) {
        await tx.performanceSchedule.createMany({
          data: dto.schedules.map((s) => ({
            performanceId: performance.id,
            dateTime: new Date(s.dateTime),
          })),
          skipDuplicates: true,
        });
      }

      // 5) Tickets
      if (dto.tickets && dto.tickets.length > 0) {
        await tx.ticket.createMany({
          data: dto.tickets.map((t) => ({
            sourceId: source.id,
            seatGrade: t.seatGrade,
            price: t.price,
          })),
        });
      }

      return tx.performance.findUniqueOrThrow({
        where: { id: performance.id },
        include: PERFORMANCE_INCLUDE,
      });
    });
  }

  async findAll() {
    return this.prisma.performance.findMany({
      include: PERFORMANCE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.performance.findUniqueOrThrow({
      where: { id },
      include: PERFORMANCE_INCLUDE,
    });
  }

  async remove(id: string) {
    return this.prisma.performance.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: PerformanceController 작성**

```typescript
// apps/server/src/performance/performance.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { FetchUrlDto } from './dto/fetch-url.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';

@ApiTags('performances')
@Controller('performances')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  /** URL에서 공연 데이터 fetch (프리뷰용) */
  @Post('fetch')
  fetchFromUrl(@Body() dto: FetchUrlDto) {
    return this.service.fetchFromUrl(dto.url);
  }

  /** 공연 생성 */
  @Post()
  create(@Body() dto: CreatePerformanceDto) {
    return this.service.create(dto);
  }

  /** 공연 목록 */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** 공연 상세 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** 공연 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 5: PerformanceModule 작성**

```typescript
// apps/server/src/performance/performance.module.ts

import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

@Module({
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
```

- [ ] **Step 6: AppModule에 import 추가**

`apps/server/src/app.module.ts`에서:

```typescript
import { PerformanceModule } from './performance/performance.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule, AttendanceModule, BookmarkModule, PerformanceModule],
  // ...
})
```

- [ ] **Step 7: 서버 빌드 확인**

Run: `cd apps/server && npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add apps/server/src/performance/ apps/server/src/app.module.ts
git commit -m "$(cat <<'EOF'
[feature] Performance 모듈 구현

- POST /performances/fetch: URL에서 공연 데이터 fetch (프리뷰용)
- POST /performances: 공연 생성 (Venue findOrCreate, Source, Schedules, Tickets 포함)
- GET /performances: 공연 목록 (relations 포함)
- GET /performances/:id: 공연 상세
- DELETE /performances/:id: 공연 삭제
EOF
)"
```

---

### Task 8: Admin — 공연 등록 페이지

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/app/performances/new/page.tsx`

- [ ] **Step 1: api.ts에 performances 메서드 추가**

`apps/admin/src/lib/api.ts`에서 기존 import에 추가:

```typescript
import type { Performance, FetchedPerformance } from '@ipchun/shared';
```

`api` 객체의 `youtube` 블록 뒤에 추가:

```typescript
  performances: {
    list: () => request<Performance[]>('/performances'),
    get: (id: string) => request<Performance>(`/performances/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Performance>('/performances', {
        method: 'POST',
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

- [ ] **Step 2: 공연 등록 페이지 작성**

```tsx
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
```

- [ ] **Step 3: 빌드 확인**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/app/performances/
git commit -m "$(cat <<'EOF'
[ui] 공연 등록 페이지 구현

- 티켓 URL 자동 가져오기 (멜론/NOL/티켓링크)
- 공연 정보, 장소, 회차, 가격, 출처 정보 편집 폼
- api.performances.fetch + create 연동
EOF
)"
```

---

### Task 9: Admin — 공연 목록 페이지 + 사이드바 네비게이션

**Files:**
- Create: `apps/admin/src/app/performances/page.tsx`
- Modify: `apps/admin/src/app/layout.tsx`

- [ ] **Step 1: 공연 목록 페이지 작성**

```tsx
// apps/admin/src/app/performances/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Performance, TicketPlatform } from '@ipchun/shared';

const platformLabels: Record<string, string> = {
  MELON: '멜론',
  NOL: 'NOL',
  TICKETLINK: '티켓링크',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function PerformancesPage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.performances
      .list()
      .then(setPerformances)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">공연</h1>
        <Link href="/performances/new" className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 공연 등록
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>
      ) : performances.length === 0 ? (
        <div className="card">
          <p className="empty-state">등록된 공연이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {performances.map((p) => (
            <div
              key={p.id}
              className="flex gap-4 p-4 border"
              style={{ borderColor: 'var(--border)' }}
            >
              {p.posterUrl && (
                <img
                  src={p.posterUrl}
                  alt={p.title}
                  className="w-20 h-28 object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{p.title}</h3>
                {p.venue && (
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    {p.venue.name}
                  </p>
                )}
                {p.schedules.length > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    {formatDate(p.schedules[0].dateTime)}
                    {p.schedules.length > 1 && ` 외 ${p.schedules.length - 1}회`}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {p.sources.map((s) => (
                    <a
                      key={s.id}
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-0.5 text-xs border"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {platformLabels[s.platform] || s.platform}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between items-end shrink-0">
                <span className="text-xs px-2 py-0.5 border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  {p.genre}
                </span>
                {p.sources[0]?.tickets?.[0] && (
                  <span className="text-sm font-medium">
                    {p.sources[0].tickets[0].price.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: layout.tsx 사이드바에 "공연" 링크 추가**

`apps/admin/src/app/layout.tsx`에서 기존 "일정" `<Link>` 블록 바로 위에 추가:

```tsx
              <Link
                href="/performances"
                className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.6"/><rect x="2" y="7" width="14" height="10" rx="1"/></svg>
                공연
              </Link>
```

- [ ] **Step 3: 빌드 확인**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/admin/src/app/performances/page.tsx apps/admin/src/app/layout.tsx
git commit -m "$(cat <<'EOF'
[ui] 공연 목록 페이지 및 사이드바 네비게이션 추가

- 공연 목록: 포스터, 제목, 장소, 일시, 플랫폼 배지, 가격 표시
- 사이드바에 "공연" 메뉴 추가
EOF
)"
```

---

## Post-Implementation Notes

### 향후 확장 포인트 (이 플랜 범위 밖)

1. **동일 공연 매칭**: 다른 플랫폼 URL을 기존 Performance에 PerformanceSource로 추가하는 기능
2. **PerformanceArtist 연동**: 공연 등록 시 아티스트 검색·연결 UI
3. **Organizer 모델 분리**: 현재 string 필드 → 별도 엔티티로 정규화
4. **자동 동기화**: PerformanceSource의 lastSyncedAt 기반 주기적 데이터 갱신
5. **공연 상세/편집 페이지**: GET /performances/:id 기반 상세 보기 및 수정
6. **기존 Schedule 모델과의 통합/마이그레이션**
