# 티켓 사이트 파서 확장 (NOL 티켓, 티켓링크, 멜론 티켓) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 스크래핑 API에 NOL 티켓(인터파크) 도메인 확장, 티켓링크, 멜론 티켓 파서를 추가하고, 라인업 추출용 이미지 리스트(`images`)를 수집할 수 있게 한다.

**Architecture:** 기존 `parsers/` 폴더 패턴(isXxxUrl + parseXxx)을 그대로 따른다. ScrapedSchedule 타입에 `images: string[]` 필드를 추가하여 상세 페이지의 모든 이미지(포스터, 상세정보, 라인업 이미지 등)를 수집한다. 기존 파서들도 images를 반환하도록 일괄 수정한다.

**Tech Stack:** Next.js API Routes, fetch + regex HTML 파싱 (기존 패턴)

---

## 조사 결과 요약

| 사이트 | 도메인 | URL 패턴 | 이미지 소스 |
|--------|--------|----------|------------|
| NOL 티켓(인터파크) | `tickets.interpark.com`, `ticket.interpark.com`, `nol.interpark.com` | `/goods/{id}` | SPA — OG image + JSON-LD image |
| 티켓링크 | `www.ticketlink.co.kr` | `/product/{id}` | OG image + `image.toast.com` CDN |
| 멜론 티켓 | `ticket.melon.com` | `/performance/index.htm?prodId={id}` | `cdnticket.melon.co.kr` 포스터 + 상세 이미지 다수 |

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/admin/src/app/api/scrape-schedule/parsers/types.ts` | `images` 필드 추가, source 타입 확장 |
| Modify | `apps/admin/src/app/api/scrape-schedule/parsers/og.ts` | `images` 반환 추가 |
| Modify | `apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts` | `images` 반환 추가 |
| Modify | `apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts` | URL 매칭 확장 + `images` 반환 추가 |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.ts` | 티켓링크 파서 (JSON-LD + OG + images) |
| Create | `apps/admin/src/app/api/scrape-schedule/parsers/melon.ts` | 멜론 티켓 파서 (HTML body regex + images) |
| Modify | `apps/admin/src/app/api/scrape-schedule/route.ts` | 새 파서들을 라우팅 체인에 추가 |

---

## Chunk 1: 타입 확장 + 기존 파서 images 필드 추가

### Task 1: ScrapedSchedule 타입에 images 필드 + source 타입 확장

**Files:**
- Modify: `apps/admin/src/app/api/scrape-schedule/parsers/types.ts`

- [ ] **Step 1: images 필드와 새 source 타입 추가**

```typescript
export interface ScrapedSchedule {
  title: string | null;
  description: string | null;
  startDate: string | null;    // ISO 8601
  endDate: string | null;      // ISO 8601
  location: string | null;     // 장소명
  address: string | null;      // 주소
  imageUrl: string | null;     // 대표 포스터/이미지
  images: string[];            // 모든 이미지 URL (포스터, 상세정보, 라인업 등)
  sourceUrl: string;           // 원본 링크
  source: 'instagram' | 'interpark' | 'ticketlink' | 'melon' | 'og' | 'unknown';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/types.ts
git commit -m "feat(admin): add images array and new source types to ScrapedSchedule"
```

---

### Task 2: 기존 파서들에 images 필드 추가

**Files:**
- Modify: `apps/admin/src/app/api/scrape-schedule/parsers/og.ts`
- Modify: `apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts`
- Modify: `apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts`

기존 파서들의 반환값에 `images` 배열을 추가한다. `imageUrl`이 있으면 `[imageUrl]`, 없으면 `[]`로 설정.

- [ ] **Step 1: og.ts — parseOg 반환값에 images 추가**

`og.ts`의 `parseOg` 함수에서 반환 객체에 images 추가:

```typescript
// parseOg 함수의 return문을 다음으로 교체:
const image = extractMetaContent(html, 'og:image');

return {
  title: extractMetaContent(html, 'og:title'),
  description: extractMetaContent(html, 'og:description'),
  startDate: null,
  endDate: null,
  location: null,
  address: null,
  imageUrl: image,
  images: image ? [image] : [],
  sourceUrl: url,
  source: 'og',
};
```

- [ ] **Step 2: instagram.ts — 두 반환 경로 모두에 images 추가**

oEmbed 성공 시 반환값:
```typescript
// oEmbed 성공 시 return문에 images 추가:
imageUrl: data.thumbnail_url || null,
images: data.thumbnail_url ? [data.thumbnail_url] : [],
```

OG 폴백 시:
```typescript
// OG 폴백 후 spread에 images 포함됨 (parseOg가 이미 images를 반환하므로)
const result = await parseOg(url);
return { ...result, source: 'instagram' };
```

- [ ] **Step 3: interpark.ts — images 필드 추가 + URL 매칭 확장**

URL 매칭 확장 (NOL 티켓 도메인 커버):
```typescript
export function isInterparkUrl(url: string): boolean {
  return /^https?:\/\/(tickets?\.|nol\.)?interpark\.com\/(goods|ticket)\//.test(url);
}
```

반환값에 images 추가:
```typescript
// parseInterpark return문에 images 추가:
return {
  title,
  description,
  startDate,
  endDate,
  location,
  address,
  imageUrl,
  images: imageUrl ? [imageUrl] : [],
  sourceUrl: url,
  source: 'interpark',
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/og.ts apps/admin/src/app/api/scrape-schedule/parsers/instagram.ts apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts
git commit -m "feat(admin): add images field to existing parsers and expand Interpark URL matching"
```

---

## Chunk 2: 티켓링크 파서

### Task 3: 티켓링크 파서 구현

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.ts`

티켓링크 페이지는 JSON-LD Event 스키마와 OG 태그를 제공한다.

- [ ] **Step 1: 티켓링크 파서 파일 생성**

```typescript
import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

export function isTicketlinkUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?ticketlink\.co\.kr\/(product|global\/)/.test(url);
}

export async function parseTicketlink(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // OG 태그 추출
  let title = extractMetaContent(html, 'og:title');
  const imageUrl = extractMetaContent(html, 'og:image');

  // 페이지 내 모든 이미지 수집 (image.toast.com CDN)
  const images: string[] = [];
  if (imageUrl) images.push(imageUrl);
  const imgMatches = html.matchAll(/<img[^>]*src="(https?:\/\/image\.toast\.com\/[^"]+)"/g);
  for (const m of imgMatches) {
    if (!images.includes(m[1])) {
      images.push(m[1]);
    }
  }

  // JSON-LD에서 이벤트 정보 추출
  let description: string | null = null;
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
        if (jsonLd.performer) {
          const performerName = typeof jsonLd.performer === 'string'
            ? jsonLd.performer
            : jsonLd.performer.name || null;
          if (performerName) {
            description = `출연: ${performerName}`;
          }
        }
        break;
      }
    } catch {
      // JSON 파싱 실패 무시
    }
  }

  // OG title에서 " | 티켓링크" 접미사 제거
  if (title) {
    title = title.replace(/\s*\|\s*티켓링크$/, '');
  }

  return {
    title,
    description,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    images,
    sourceUrl: url,
    source: 'ticketlink',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.ts
git commit -m "feat(admin): add Ticketlink parser with JSON-LD Event + OG + images"
```

---

## Chunk 3: 멜론 티켓 파서

### Task 4: 멜론 티켓 파서 구현

**Files:**
- Create: `apps/admin/src/app/api/scrape-schedule/parsers/melon.ts`

멜론 티켓은 OG 태그나 JSON-LD가 없다. HTML body에서 직접 추출한다.
이미지가 가장 풍부한 소스 — `cdnticket.melon.co.kr` 도메인에서 포스터 + 상세정보 이미지 다수를 수집한다.

실제 HTML 구조 (조사 결과):
- 포스터: `<img src="https://cdnticket.melon.co.kr/.../product/.../quality/50">`
- 상세 이미지: `<img src="https://cdnticket.melon.co.kr/.../product/.../quality/90/optimize">`
- 아티스트 이미지: `<img src="https://cdnimg.melon.co.kr/cm2/artistcrop/...">`

- [ ] **Step 1: 멜론 티켓 파서 파일 생성**

```typescript
import { ScrapedSchedule } from './types';
import { fetchHtml } from './og';

export function isMelonTicketUrl(url: string): boolean {
  return /^https?:\/\/ticket\.melon\.com\/performance\//.test(url);
}

/** 한국식 날짜 문자열 "2026.02.27"을 ISO 8601로 변환 */
function koreanDateToIso(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function parseMelonTicket(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // 제목 추출: <p class="tit">...</p> 또는 <span class="txt">...</span>
  let title: string | null = null;
  const titleMatch = html.match(/<(?:p class="tit"|span class="txt")>([\s\S]*?)<\/(?:p|span)>/);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // 공연기간 추출: "2026.02.27 - 2026.02.27" 패턴
  let startDate: string | null = null;
  let endDate: string | null = null;
  const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})\s*[-~]\s*(\d{4}\.\d{2}\.\d{2})/);
  if (dateMatch) {
    startDate = koreanDateToIso(dateMatch[1]);
    endDate = koreanDateToIso(dateMatch[2]);
  }

  // 공연장 이름 추출
  let location: string | null = null;
  const venueMatch = html.match(/<a[^>]*href="javascript[^"]*"[^>]*title="([^"]*)"[^>]*>/);
  if (venueMatch) {
    location = venueMatch[1].trim();
  }

  // 주소 추출
  let address: string | null = null;
  const addressMatch = html.match(/<p[^>]*>\s*((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^<]{5,80})\s*<\/p>/);
  if (addressMatch) {
    address = addressMatch[1].trim();
  }

  // 모든 이미지 수집: cdnticket.melon.co.kr 상품 이미지 + cdnimg.melon.co.kr 아티스트 이미지
  const images: string[] = [];
  const imgMatches = html.matchAll(
    /<img[^>]*src="(https?:\/\/cdn(?:ticket|img)\.melon\.co\.kr\/[^"]+)"/g,
  );
  for (const m of imgMatches) {
    if (!images.includes(m[1])) {
      images.push(m[1]);
    }
  }

  // 대표 이미지: 첫 번째 상품 이미지
  const imageUrl = images[0] || null;

  return {
    title,
    description: null,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    images,
    sourceUrl: url,
    source: 'melon',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/parsers/melon.ts
git commit -m "feat(admin): add Melon Ticket parser with HTML regex + image collection"
```

---

## Chunk 4: 라우트 통합

### Task 5: API Route에 새 파서들 연결

**Files:**
- Modify: `apps/admin/src/app/api/scrape-schedule/route.ts`

- [ ] **Step 1: 새 파서 import 추가 + if-else 체인 확장**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isInstagramUrl, parseInstagram } from './parsers/instagram';
import { isInterparkUrl, parseInterpark } from './parsers/interpark';
import { isTicketlinkUrl, parseTicketlink } from './parsers/ticketlink';
import { isMelonTicketUrl, parseMelonTicket } from './parsers/melon';
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
    } else if (isTicketlinkUrl(url)) {
      result = await parseTicketlink(url);
    } else if (isMelonTicketUrl(url)) {
      result = await parseMelonTicket(url);
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

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/api/scrape-schedule/route.ts
git commit -m "feat(admin): add Ticketlink and Melon Ticket to scrape route"
```

---

## 확장 가능성 (향후)

- **Yes24 티켓** (`ticket.yes24.com`): 동일 패턴으로 `parsers/yes24.ts` 추가 가능
- **JSON-LD 파싱 공통화**: interpark, ticketlink 파서의 JSON-LD Event 파싱 로직이 중복됨 — 파서가 3개 이상 되면 공통 유틸로 추출 고려
