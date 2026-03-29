# 멀티 플랫폼 티켓 데이터 통합 스펙

> 여러 티켓 플랫폼에서 공연 정보를 추출하고, 하나의 통합 데이터 모델로 정규화하기 위한 스펙 문서.
> **3사 모두 Playwright 없이 HTTP API만으로 데이터 추출이 가능하다.**

## 대상 플랫폼

| 플랫폼 | URL 패턴 | 추출 방식 | Base URL |
|--------|----------|-----------|----------|
| **멜론 티켓** | `ticket.melon.com/performance/index.htm?prodId={id}` | HTML 파싱 (SSR) | 페이지 직접 파싱 |
| **NOL (인터파크)** | `tickets.interpark.com/goods/{id}` | REST API | `api-ticketfront.interpark.com` |
| **티켓링크** | `ticketlink.co.kr/product/{id}` | JSON-LD + REST API | `mapi.ticketlink.co.kr` |

### 참고 공연 샘플

| 플랫폼 | ID | 공연명 | 아티스트 |
|--------|----|--------|----------|
| 멜론 | 212888 | 현대카드 Curated 104 김승주 | 김승주 |
| 멜론 | 212974 | 노아코스트 단독 콘서트 'Coast Night' | 노아코스트 |
| NOL | 26003199 | Vaundy ASIA ARENA TOUR 2026 "HORO" IN SEOUL | Vaundy |
| NOL | 26000547 | BTS WORLD TOUR 'ARIRANG' IN GOYANG | BTS |
| 티켓링크 | 62107 | NERD CONNECTION S/S 2026 | 너드커넥션 |
| 티켓링크 | 61752 | 페퍼톤스 어쿠스틱 라이브 : 안락 | 페퍼톤스 |

---

## 1. 플랫폼별 API 상세

### 멜론 티켓

```
방식: HTML 파싱 (cheerio / node-html-parser)
인증: 불필요
장점: SSR → 단순 HTTP GET으로 모든 데이터 추출 가능
특이: 관련 음악 데이터 (멜론 음원 연결) — 다른 플랫폼에 없는 고유 데이터
```

**추출 가능 필드**: 전체 (공연 정보, 일정, 장소, 가격, 할인, 출연진, 주최, 취소 정책, 관련 음악)

### NOL (인터파크)

```
방식: REST API (api-ticketfront.interpark.com)
인증: 불필요 (Referer 헤더 필수)
장점: summary 한 번 호출로 거의 모든 핵심 데이터 확보
```

**필수 헤더**:
```
Referer: https://tickets.interpark.com/goods/{goodsCode}
User-Agent: Mozilla/5.0 ...
Accept: application/json
```

**API 엔드포인트**:

| 엔드포인트 | 데이터 | 인증 |
|-----------|--------|:----:|
| `GET /v1/goods/{id}/summary` | **전체 상세** — 아래 필드 테이블 참조 | 불필요 |
| `GET /v1/goods/{id}/prices/group` | **좌석등급별 가격** (등급명, 가격, 할인율) | 불필요 |
| `GET /v1/Place/{placeCode}` | **공연장 상세** (이름, 주소, 좌표, 홈페이지) | 불필요 |
| `GET /v1/goods/{id}/tab/info` | 공연 상세 탭 정보 | 불필요 |
| `GET /v1/goods/{id}/tab/addition` | 부가 정보 탭 | 불필요 |
| `GET /v1/goods/casting` | 캐스팅 정보 | 불필요 |
| `GET /v1/goods/{id}/playSeq` | 회차 스케줄 | 불필요 |
| `GET /v1/bizInfo/{bizCode}` | 기획사/주최 상세 | 불필요 |

**`/summary` 응답 주요 필드**:

| API 필드 | 설명 | 예시 |
|----------|------|------|
| `goodsCode` | 상품 ID | `26003199` |
| `goodsName` | 공연 제목 | Vaundy ASIA ARENA TOUR 2026 "HORO" IN SEOUL |
| `genreName` | 장르 | 콘서트 |
| `viewRateName` | 관람등급 | 만 7세이상 |
| `runningTime` | 러닝타임 (분) | 120 |
| `interMissionTime` | 인터미션 (분) | 0 |
| `playStartDate` | 시작일 | 20260919 |
| `playEndDate` | 종료일 | 20260920 |
| `playTime` | 회차별 시각 (텍스트) | "9/19 5PM / 9/20 4PM" |
| `ticketOpenDate` | 예매 오픈일시 | 202603112000 |
| `placeName` | 공연장명 | 인스파이어 아레나 |
| `placeCode` | 공연장 코드 (Place API 키) | 26000240 |
| `goodsLargeImageUrl` | 포스터 이미지 | `//ticketimage.interpark.com/...` |
| `bizInfo` | 주최/주관 텍스트 | "빅히트뮤직 · 하이브" |
| `bizCode` | 기획사 코드 | 63207 |
| `specialSeatingName` | 판매 유형 | 단독판매 |
| `goodsStatus` | 판매 상태 | Y |
| `bookingEndDate` | 예매 마감일 | 202609191100 |

**`/prices/group` 응답 예시** (26003199):
```json
{
  "스탠딩석": { "기본가": [{ "seatGradeName": "스탠딩석", "salesPrice": 165000 }] },
  "R석":     { "기본가": [{ "seatGradeName": "R석", "salesPrice": 165000 }] },
  "S석":     { "기본가": [{ "seatGradeName": "S석", "salesPrice": 154000 }] }
}
```

**`/Place/{placeCode}` 응답 예시**:
```json
{
  "placeName": "인천 인스파이어 아레나",
  "placeAddress": "인천광역시 중구 공항문화로 127(운서동)",
  "longitude": "126.389",
  "latitude": "37.465",
  "placeTypeName": "종합극장"
}
```

### 티켓링크

```
방식: JSON-LD 파싱 + MAPI (mapi.ticketlink.co.kr) 조합
인증: 대부분 불필요 (일부 상세 필드는 인증 필요)
장점: JSON-LD로 구조화된 핵심 데이터, MAPI로 일정/정책 보강
한계: 러닝타임, 관람등급, 좌석등급별 가격은 인증 필요
```

**Layer 1 — JSON-LD** (HTML에서 파싱):

| JSON-LD 필드 | 설명 |
|-------------|------|
| `name` | 공연 제목 |
| `startDate`, `endDate` | 기간 |
| `location.name`, `location.address` | 장소 |
| `offers.price` | 대표 가격 (1개) |
| `offers.availability` | 판매 상태 |
| `performer.name` | 아티스트명 |
| `organizer.name` | 주최사 |
| `image` | 포스터 URL |
| `eventStatus` | 공연 상태 |

**Layer 2 — MAPI 비인증** (`https://mapi.ticketlink.co.kr/mapi/`):

| 엔드포인트 | 데이터 | 인증 |
|-----------|--------|:----:|
| `GET product/{id}` | productId, productName, productImagePath | 불필요 |
| `GET product/{id}/datesByUtc` | **회차별 날짜 + 정확한 공연 시각** (epoch ms) | 불필요 |
| `GET product/{id}/common/info` | 취소/환불(RCI), 환불안내(TRI), 수령안내(TGI) — HTML | 불필요 |
| `GET product/additional?productId={id}` | 교환/반품 가이드 | 불필요 |

**`datesByUtc` 응답 예시** (61752 페퍼톤스):
```json
{ "data": [
    { "productDate": 1776421800000 },  // 2026-04-17 19:30 KST
    { "productDate": 1776502800000 },  // 2026-04-18 18:00 KST
    { "productDate": 1776585600000 },  // 2026-04-19 17:00 KST
    { "productDate": 1777026600000 },  // 2026-04-24 19:30 KST
    { "productDate": 1777107600000 },  // 2026-04-25 18:00 KST
    { "productDate": 1777190400000 }   // 2026-04-26 17:00 KST
]}
```

**Layer 3 — MAPI 인증 필요** (`TKL_MEMBER_DEVICE_ID` 필요):

| 엔드포인트 | 데이터 |
|-----------|--------|
| `GET product/{id}/detail?deviceId={n}` | runningTime, viewClassCode(관람등급), hallName, locationName |
| `GET schedule/{id}/grades?productClassCode={n}&productId={s}` | 좌석등급별 가격 |

> Layer 3 필드는 같은 공연이 멜론/NOL에도 있으면 거기서 보강 가능. **사실상 Playwright 불필요.**

---

## 2. 플랫폼별 데이터 가용성 비교

`●` HTTP만으로 추출 확인 / `△` 인증 또는 추가 파싱 필요 / `✕` 미제공

### 공연 기본 정보

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 공연 제목 | ● | ● | ● | NOL: `goodsName` / 티켓링크: JSON-LD `name` |
| 부제/영문명 | ● | ✕ | ✕ | 멜론 전용 |
| 장르 | ● | ● | ● | NOL: `genreName` |
| 관람등급 | ● | ● | △ | NOL: `viewRateName` |
| 포스터 이미지 | ● | ● | ● | NOL: `goodsLargeImageUrl` |
| 공연 상태 | ● | ● | ● | NOL: `goodsStatus` |

### 일정 정보

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 시작일 | ● | ● | ● | NOL: `playStartDate` |
| 종료일 | ● | ● | ● | NOL: `playEndDate` |
| 회차별 날짜+시각 | ● | ● | ● | NOL: `playTime` (텍스트) / 티켓링크: MAPI `datesByUtc` (epoch) |
| 러닝타임 | ● | ● | △ | NOL: `runningTime` |
| 인터미션 | ✕ | ● | △ | NOL: `interMissionTime` |
| 티켓 오픈일시 | ● | ● | △ | NOL: `ticketOpenDate` |
| 예매 마감일 | ✕ | ● | ✕ | NOL: `bookingEndDate` |

### 장소 정보

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 공연장명 | ● | ● | ● | NOL: `placeName` + Place API |
| 주소 | ● | ● | ● | NOL: Place API `placeAddress` |
| 좌표 (위도/경도) | ✕ | ● | ✕ | NOL Place API: `longitude`, `latitude` |
| 전화번호 | ● | ✕ | ✕ | |
| 웹사이트 | ● | ✕ | ✕ | |

### 가격/티켓 정보

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 좌석등급별 가격 | ● | ● | △ | NOL: `/prices/group` — 등급명+가격+할인율 |
| 대표 가격 | ● | ● | ● | 티켓링크: JSON-LD `offers.price` |
| 판매 상태 | ● | ● | ● | |
| 판매 유형 | ● | ● | ✕ | NOL: `specialSeatingName` (단독판매 등) |

### 출연진/주최

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 아티스트명 | ● | ● | ● | NOL: `goodsName`에서 추출 또는 casting API |
| 관련 음악 | ● | ✕ | ✕ | 멜론 전용 (음원 플랫폼) |
| 주최/주관 | ● | ● | ● | NOL: `bizInfo` |
| 기획�� 코드 | ✕ | ● | ✕ | NOL: `bizCode` → `/bizInfo/{code}` |

### 정책

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 취소/환불 정책 | ● | ● | ● | NOL: `summary.displayTemplate` / 티켓링크: MAPI `common/info` |
| 환불 처리 안내 | ● | ● | ● | |
| 취소 마감 시간 | ● | ● | ● | NOL: `bookingPossibleTimeCodeName` |

### 부가 데이터

| 필드 | 멜론 | NOL | 티켓링크 | 비고 |
|------|:----:|:---:|:--------:|------|
| 랭킹 (일/주/월) | ✕ | ● | ✕ | NOL: `dayRank`, `weekRank`, `monthRank` |
| 리뷰 수 | ✕ | ● | ✕ | NOL: `reviewCount` |
| 기대평 수 | ✕ | ● | ✕ | NOL: `ticketCastCount` |

---

## 3. 3사 공통 필드 (Playwright 없이 확보)

**16개 필드**를 HTTP API만으로 3개 플랫폼 공통 추출 가능.

| # | 필드 | 멜론 소스 | NOL 소스 | 티켓링크 소스 |
|---|------|----------|----------|-------------|
| 1 | 공연 제목 | HTML | `goodsName` | JSON-LD `name` |
| 2 | 장르 | HTML | `genreName` | JSON-LD 카테고리 |
| 3 | 포스터 이미지 | HTML | `goodsLargeImageUrl` | JSON-LD `image` |
| 4 | 시작일 | HTML | `playStartDate` | JSON-LD `startDate` |
| 5 | 종료일 | HTML | `playEndDate` | JSON-LD `endDate` |
| 6 | 회차별 날짜+시각 | HTML | `playTime` | MAPI `datesByUtc` |
| 7 | 공연장명 | HTML | `placeName` | JSON-LD `location.name` |
| 8 | 주소 | HTML | Place API `placeAddress` | JSON-LD `location.address` |
| 9 | 아티스트명 | HTML | `goodsName` / casting API | JSON-LD `performer.name` |
| 10 | 대표 가격 | HTML | `/prices/group` 첫 번째 | JSON-LD `offers.price` |
| 11 | 판매 상태 | HTML | `goodsStatus` | JSON-LD `availability` |
| 12 | 주최/주관 | HTML | `bizInfo` | JSON-LD `organizer.name` |
| 13 | 취소/환불 정책 | HTML | `displayTemplate` | MAPI `common/info` |
| 14 | 관람등급 | HTML | `viewRateName` | **멜론/NOL에서 보강** |
| 15 | 러닝타임 | HTML | `runningTime` | **멜론/NOL에서 보강** |
| 16 | 티켓 오픈일시 | HTML | `ticketOpenDate` | **멜론/NOL에서 보강** |

> 14~16번은 티켓링크 단독으로는 인증이 필요하지만, 같은 공연이 멜론/NOL에도 등록되어 있으면 거기서 채우는 전략.

### 플랫폼 전용 필드 (공통 아닌 보너스)

| 필드 | 플랫폼 | 활용 |
|------|--------|------|
| 관련 음악 (대표곡) | 멜론 전용 | 아티스트 프로필 보강 |
| 부제/영문명 | 멜론 전용 | 검색 키워드 |
| 좌표 (위도/경도) | NOL 전용 | 지도 연동 (지오코딩 불필요) |
| 랭킹 (일/주/월) | NOL 전용 | 인기 공연 정렬 |
| 리뷰/기대평 수 | NOL 전용 | 공연 관심도 지표 |
| 인터미션 시간 | NOL 전용 | 공연 상세 보강 |
| 좌석등급별 가격 | 멜론 + NOL | 가격 비교 기능 |

---

## 4. 통합 데이터 모델 (Unified Schema)

### 핵심 개념: Source 분리

같은 공연이 여러 플랫폼에서 판매될 수 있으므로, **공연 엔티티**와 **소스(출처) 엔티티**를 분리한다.

```
Performance (공연) ← 플랫폼 무관, 정규화된 단일 엔티티
  └── 1:N  PerformanceSource (출처) ← 플랫폼별 원본 링크 + 플랫폼 고유 데이터
```

### Performance (공연)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | IPCHUN 내부 PK |
| `title` | string | 정규화된 공연 제목 |
| `subtitle` | string? | 부제/영문명 |
| `genre` | enum | CONCERT, MUSICAL, PLAY, CLASSIC, FESTIVAL, OTHER |
| `ageRating` | string? | "전체관람가", "만 7세이상", "만 9세이상" 등 |
| `runtime` | number? | 러닝타임 (분) |
| `intermission` | number? | 인터미션 (분) |
| `posterUrl` | string | 대표 포스터 (가장 고해상도 소스 우선) |
| `status` | enum | SCHEDULED, ON_SALE, SOLD_OUT, COMPLETED, CANCELLED |
| `venueId` | FK → Venue | |
| `organizerId` | FK → Organizer | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### PerformanceSource (출처)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `performanceId` | FK → Performance | |
| `platform` | enum | MELON, NOL, TICKETLINK |
| `externalId` | string | 플랫폼 내 고유 ID |
| `sourceUrl` | string | 원본 페이지 URL |
| `ticketOpenAt` | datetime? | 이 플랫폼의 예매 오픈 일시 |
| `bookingEndAt` | datetime? | 예매 마감일 |
| `salesStatus` | string? | 이 플랫폼의 판매 상태 |
| `rawData` | json? | 파싱된 원본 데이터 전체 (디버깅/보강용) |
| `lastSyncedAt` | datetime | 마지막 동기화 시각 |

### Schedule (회차)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `performanceId` | FK → Performance | |
| `date` | date | 공연 날짜 |
| `showTime` | time? | 공연 시각 |

### Venue (공연장)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `name` | string | 정규화된 공연장명 |
| `aliases` | string[] | 플랫폼별 표기 차이 |
| `address` | string | |
| `latitude` | number? | NOL Place API에서 직접 제공 |
| `longitude` | number? | NOL Place API에서 직접 제공 |
| `phone` | string? | 멜론에서 제공 |
| `website` | string? | 멜론에서 제공 |
| `capacity` | number? | 보강 데이터 |

### Artist (아티스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `name` | string | 정규화된 아티스트명 |
| `aliases` | string[] | 표기 차이 |
| `members` | string[]? | 멤버 |
| `spotifyMeta` | json? | 기존 Spotify 연동 데이터 |

### PerformanceArtist (공연-아티스트 M:N)

| 필드 | 타입 | 설명 |
|------|------|------|
| `performanceId` | FK → Performance | |
| `artistId` | FK → Artist | |
| `role` | enum? | MAIN, GUEST, DJ, MC |

### Ticket (좌석/가격)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `sourceId` | FK → PerformanceSource | |
| `seatGrade` | string | 등급명 |
| `price` | number | 원 단위 |
| `maxPerUser` | number? | |

### Discount (할인)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `ticketId` | FK → Ticket | |
| `name` | string | 할인명 |
| `rate` | number? | % |
| `type` | enum | CARD, WELFARE, YOUTH, OTHER |

### Organizer (주최/기획)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | |
| `producer` | string? | 기획사 |
| `host` | string? | 주최 |
| `organizer` | string? | 주관 |
| `contactPhone` | string? | |
| `contactEmail` | string? | |

---

## 5. ERD (통합)

```
Performance (공연) ──────────────────────────────────
├── 1:N  PerformanceSource (출처: 멜론/NOL/티켓링크)
│         ├── 1:N  Ticket (좌석/가격)
│         │         └── 1:N  Discount (할인)
│         └── platform, externalId, ticketOpenAt, salesStatus
├── 1:N  Schedule (회차: 날짜+시각)
├── M:N  Artist (출연진) ── via PerformanceArtist
│         └── aliases[], members[], spotifyMeta
├── N:1  Venue (장소)
│         └── aliases[], lat/lng
└── N:1  Organizer (주최/기획)
```

---

## 6. 동일 공연 매칭 전략

### 매칭 키

```
matchKey = normalize(artistName) + "_" + normalize(venueName) + "_" + startDate

예시:
  멜론:    "김승주_현대카드언더스테이지_2026-03-29"
  NOL:     "김승주_현대카드언더스테이지_2026-03-29"
  → 동일 matchKey → 같은 Performance로 병합
```

### 매칭 단계

```
1단계: 정확 매칭 (자동)
  → 공연장 + 날짜 + 아티스트명이 모두 일치

2단계: 유사 매칭 (자동 + 검증)
  → 아티스트명 유사도 (alias 포함) + 날짜 범위 겹침 + 같은 도시

3단계: 수동 매칭
  → 자동 매칭 실패 시 관리자가 직접 연결
```

### 정규화 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 아티스트명 | 공백 제거, 소문자, 괄호 내용 제거 | "페퍼톤스(신재평, 이장원)" → "페퍼톤스" |
| 공연장명 | 공백 제거, "홀/극장/씨어터" 등 접미사 통일 | "롤링 홀" = "롤링홀" |
| 날짜 | ISO 8601 (YYYY-MM-DD) | |

### 충돌 해결

| 필드 | 전략 | 이유 |
|------|------|------|
| `title` | 가장 긴 제목 우선 | 상세한 쪽이 정보가 많음 |
| `posterUrl` | 가장 고해상도 우선 | 카드뉴스 소재 품질 |
| `runtime` | null이 아닌 값 우선, 멜론/NOL 우선 | |
| `ageRating` | 가장 높은 등급 우선 | 안전한 쪽으로 |
| `price` | 플랫폼별 별도 저장 (Source별) | 가격이 다를 수 있음 |
| `ticketOpenAt` | 플랫폼별 별도 저장 (Source별) | 오픈 시각이 다름 |
| `venue.latitude/longitude` | NOL 값 우선 | Place API에서 직접 제공 |

---

## 7. 데이터 수집 파이프라인

```
[입력: URL]
    │
    ▼
[URL 파서] ── 플랫폼 + externalId 추출
    │   ticket.melon.com/...?prodId=212888   → MELON, "212888"
    │   tickets.interpark.com/goods/26003199 → NOL, "26003199"
    │   ticketlink.co.kr/product/62107       → TICKETLINK, "62107"
    │
    ▼
[플랫폼별 Fetcher] ── 각 플랫폼 전용 HTTP 호출
    │
    │   MELON:      GET HTML → cheerio 파싱
    │   NOL:        GET /v1/goods/{id}/summary (+ /prices/group, /Place/{code})
    │   TICKETLINK: GET HTML → JSON-LD 파싱 + GET MAPI datesByUtc, common/info
    │
    ▼
[정규화] ── 통합 스키마로 변환
    │   이름 정규화, 날짜 포맷 통일, 가격 단위 통일
    │
    ▼
[매칭] ── 기존 Performance와 matchKey 비교
    │   일치 → PerformanceSource 추가 (+ 필드 보강)
    │   불일치 → 새 Performance 생성
    │
    ▼
[저장] ── DB Upsert
    │
    ▼
[보강] ── 크로스 플랫폼 필드 채우기
            티켓링크에 없는 러닝타임 → NOL/멜론에서 보강
            멜론에 없는 좌표 → NOL Place API에서 보강
            Artist Spotify 연동
```

---

## 8. IPCHUN 활용 시나리오

### 시나리오 A: 관리자가 URL 입력

```
1. 관리자가 멜론/NOL/티켓링크 URL을 붙여넣기
2. 플랫폼 자동 감지 → API 호출 → 정규화
3. 기존 공연과 매칭 시도
4. 새 공연이면 생성, 기존 공연이면 소스 추가
5. 관리자에게 프리뷰 → 확인 후 저장
```

### 시나리오 B: 사용자 관점 — 공연 상세 페이지

```
"페퍼톤스 어쿠스틱 라이브 : 안락"

📍 이화여자대학교 ECC 영산극장
📅 2026.04.17 ~ 04.26 (6회)
⏱ 러닝타임 120분

🎫 예매처 비교:
  ├── 멜론 티켓     ₩110,000  [예매하기 →]
  ├── NOL           ₩110,000  [예매하기 →]
  └── 티켓링크      ₩110,000  [예매하기 →]

⏰ 예매 오픈 알림:
  ├── 멜론: 03.20 20:00
  ├── NOL: 03.21 20:00
  └── 티켓링크: 03.22 12:00
```

### 시나리오 C: 카드뉴스 자동 생성

```
소스 데이터:
  - 포스터 이미지 (가장 고해상도 플랫폼에서)
  - 공연 제목 + 아티스트명
  - 일시 + 장소
  - 가격 (최저가 플랫폼 표시)
  - 예매 링크 (모든 플랫폼)
```
