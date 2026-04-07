---
name: register-performance
description: "공연 자동 등록 & 동기화 — 티켓 플랫폼(melon/nol/ticketlink/yes24)에서 공연을 탐색하여 DB에 자동 등록하고, 아티스트 자동 생성, 크로스 플랫폼 중복 병합, 상태 업데이트를 수행한다. /loop과 함께 플랫폼별 무한 스캔 가능. Use when: '공연 등록', 'register', '티켓 등록', '공연 스캔', '공연 자동화', '공연 루프', '공연 크롤링', '스케줄 등록', '공연 파싱해서 넣어' 등을 언급하거나, 특정 티켓 URL을 주며 등록 요청할 때. 또한 /loop과 함께 사용하여 플랫폼별 자동 스캔을 설정할 때도 사용."
---

# Register Performance: 공연 자동 등록 & 동기화

티켓 플랫폼에서 공연 데이터를 가져와 DB에 등록하고, 아티스트 자동 생성 / 크로스 플랫폼 병합 / 기존 공연 업데이트를 자동 처리한다.

## Arguments

- `/register <url>` — 특정 URL 하나 등록
- `/register melon` — 멜론 1회 스캔
- `/register nol` — NOL 1회 스캔
- `/register ticketlink` — 티켓링크 1회 스캔
- `/register yes24` — YES24 1회 스캔
- `/register all` — 4개 플랫폼 동시 스캔 (서브에이전트 병렬)

`/loop`과 함께 사용 (각 플랫폼 독립 실행):
```
/loop 10m /register melon
/loop 10m /register nol
/loop 10m /register ticketlink
/loop 10m /register yes24
```

## 핵심 원칙

1. **모든 DB 수정은 REST API** — Prisma 직접 호출 금지. curl로 API 호출.
2. **로컬 상태 추적** — `tools/register/data/`에 플랫폼별 JSON 상태 저장.
3. **아티스트 자동 생성** — DB에 없는 아티스트는 즉시 API로 생성.
4. **크로스 플랫폼 병합** — 동일 공연이 여러 플랫폼에 있으면 하나로 합침.
5. **기존 공연 업데이트** — 이미 등록된 공연은 변경사항 감지 후 PATCH.
6. **요청 딜레이 2초** — 외부 서비스 rate limit 존중.
7. **Claude 지능 활용** — 너는 단순 스크립트가 아니라 Claude다. fetcher가 반환한 데이터가 부족하면 제목·맥락을 보고 직접 판단하여 정보를 보완한다.

## API 환경

- 로컬: `http://localhost:3000`
- 프로덕션: `https://api.ipchun.live`

스캔 전 서버 상태 확인:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/performances/calendar?year=2026&month=1"
```
200이면 로컬 사용. 실패하면 프로덕션 사용. 둘 다 안 되면 중단하고 사용자에게 알림.

API 엔드포인트 상세는 `references/api-cheatsheet.md` 참조.

## 상태 파일

```
tools/register/data/
├── global.json          # 크로스 플랫폼 매핑 (중복 감지용)
├── melon.json           # 멜론 상태
├── nol.json             # NOL 상태
├── ticketlink.json      # 티켓링크 상태
└── yes24.json           # YES24 상태
```

### 플랫폼 상태 스키마

```json
{
  "explored": ["12345", "12346"],
  "registered": {
    "12345": { "performanceId": "uuid", "title": "공연명" }
  },
  "failed": ["99999"],
  "seeds": ["12340", "12350"],
  "lastRun": "2026-04-07T12:00:00Z"
}
```

- `explored`: 이미 시도한 ID (성공/실패/404 모두 포함)
- `registered`: 등록 성공한 ID → performanceId 매핑
- `failed`: 파싱 에러 (404가 아닌 실제 에러)
- `seeds`: 유효했던 ID (인접 탐색의 기준점)

### 글로벌 상태 스키마

```json
{
  "performances": {
    "perf-uuid": {
      "title": "원본 제목",
      "normalizedTitle": "정규화된제목",
      "venueName": "공연장",
      "dates": ["2026-05-01", "2026-05-02"],
      "sources": [
        { "platform": "MELON", "externalId": "12345" },
        { "platform": "NOL", "externalId": "67890" }
      ]
    }
  }
}
```

## 워크플로우

### Mode A: URL 직접 등록

1. **Fetch**: `POST /performances/fetch` with `{"url": "<url>"}`
   - 409 Conflict → 이미 등록됨. 응답에서 기존 정보 확인 후 **업데이트 체크**로.
   - 성공 → `FetchedPerformance` 획득.
2. **데이터 보완** (Claude 지능 활용 섹션 참조):
   - 장르 보정 (OTHER → 적절한 장르)
   - subtitle 추출
   - status/lineupMode 결정
3. **중복 체크**: 글로벌 상태에서 크로스 플랫폼 매칭 (→ 중복 감지 섹션).
4. **등록**: `FetchedPerformance`를 `CreatePerformanceDto`로 변환하여 `POST /performances`. 반환된 `id`를 반드시 저장.
5. **아티스트 처리 (필수 — 절대 스킵하지 않는다)**:
   a. `artistNames`에 값이 있으면 → 그대로 사용.
   b. 비어있으면 → 제목/맥락에서 Claude가 직접 식별 (→ 아티스트 식별 섹션).
   c. 페스티벌이면 → 라인업을 적극적으로 파악. 필요하면 티켓 페이지를 WebFetch로 직접 확인하여 출연진 목록 추출.
   d. 식별된 각 아티스트를 `GET /artists?search=` 로 검색 → 없으면 `POST /artists` 생성.
   e. `PUT /performances/:id/artists` 로 연결. **이 단계를 빠뜨리면 아티스트 없는 공연이 된다.**
6. **상태 업데이트**: 플랫폼 상태 + 글로벌 상태 저장.

### Mode B: 플랫폼 스캔

1. **상태 로드**: `tools/register/data/{platform}.json` 로드 (없으면 빈 상태로 초기화).
2. **ID 선정**: 20개 미탐색 ID 선택.
   - autoparse의 `tools/autoparse/seeds.json`에서 시드 가져오기.
   - seeds에서 인접 ID(±50 범위) 생성.
   - explored에 없는 것만 사용.
3. **각 ID 처리** (순차, 2초 딜레이):
   a. URL 생성: 플랫폼별 템플릿으로 URL 조립.
   b. `POST /performances/fetch` 호출.
   c. **500 또는 네트워크 에러** → 유효하지 않은 ID. explored에 추가, 스킵. (500 = 존재하지 않는 공연 또는 페이지 파싱 실패)
   d. **409 Conflict** → 이미 등록됨. 업데이트 체크로. 409 메시지에서 제목 파싱 가능: `"이미 등록된 공연입니다: \"제목\" (PLATFORM ID)"`. performanceId는 플랫폼 상태의 `registered`에서 조회.
   e. **200 성공** → 중복 체크 → 새 등록 or 소스 병합. 유효 ID이므로 seeds에도 추가.
4. **상태 저장** 및 **결과 보고**.

#### 플랫폼별 URL 템플릿

| Platform | Template |
|----------|----------|
| melon | `https://ticket.melon.com/performance/index.htm?prodId={id}` |
| nol | `https://tickets.interpark.com/goods/{id}` |
| ticketlink | `https://www.ticketlink.co.kr/product/{id}` |
| yes24 | `https://ticket.yes24.com/Perf/{id}` |

### Mode C: 전체 스캔 (`/register all`)

4개 플랫폼을 **병렬 서브에이전트**로 동시 실행:

```
각 플랫폼마다 Agent 디스패치:
  "tools/register/data/{platform}.json 상태를 로드하고,
   Mode B 워크플로우를 실행해.
   API base: {baseUrl}
   결과를 요약해서 반환해."
```

글로벌 상태는 각 서브에이전트가 독립적으로 읽고 쓰므로, 병합 충돌 가능성이 있다.
→ 각 서브에이전트가 완료된 후 메인에서 글로벌 상태를 통합 업데이트한다.

## Claude 지능 활용: 데이터 보완

너는 Claude Code 안에서 실행되는 스킬이다. fetcher가 반환한 데이터는 기계적 파싱 결과이므로 빈 필드가 많다. 네가 아는 지식과 문맥을 활용해서 적극적으로 보완한다.

### 아티스트 식별

fetcher의 `artistNames`는 자주 비어있다. 제목을 보고 **네가 직접 판단**해서 아티스트를 식별한다:

1. **`artistNames`에 값이 있으면** → 그대로 사용하되, 콘서트 부제목이 섞여있으면 걸러낸다.
   - 예: `["MUSEUM : village of eternal glow - Live House"]` → 이건 아티스트가 아니라 부제목. 제목 "문별 CONCERT [MUSEUM...]"에서 "문별"을 추출.
2. **비어있으면** → 제목 전체를 보고 아티스트를 판단:
   - `"2026 이진솔 FANMEETING 〈Eternal Moment〉"` → "이진솔"
   - `"현대카드 Curated 104 김승주"` → "김승주"
   - `"먼데이프로젝트X숲세권 MONDAY:SOOP [예람 단독 콘서트]"` → "예람"
   - `"2026 YENA LIVE TOUR [잡힐 듯 말 듯 한, 2세계!] In Seoul"` → "YENA" (= 최예나)
3. **뮤지컬/연극 등 비-콘서트** → 아티스트 추출하지 않음 (작품명이지 아티스트가 아니므로).
4. **페스티벌** → 출연진이 여러 명이면 가능한 만큼 식별. 모르면 무리하지 않는다.

핵심: regex가 아니라 **네 지식**을 쓴다. "YENA"가 최예나라는 걸 알고, "문별"이 마마무 멤버라는 걸 아는 것이 단순 패턴 매칭과의 차이다.

### 포스터 이미지 분석

포스터에 아티스트 라인업이 적혀있는 경우가 많다. 특히 페스티벌 포스터에는 출연진 전체가 나열되어 있다.

**이미지 분석 방법**:
1. `FetchedPerformance.posterUrl`에서 이미지 URL 획득.
2. WebFetch로 이미지 다운로드 (로컬 파일로 저장됨):
   ```
   WebFetch(url: posterUrl, prompt: "이미지 저장")
   ```
   → 결과에 `[Binary content ... saved to /path/to/file.gif]` 경로가 나옴.
3. **Read 도구로 저장된 이미지 파일 열기** → Claude가 이미지를 직접 보고 분석:
   ```
   Read(file_path: "/path/to/saved-image.gif")
   ```
4. 이미지에서 아티스트 이름, 라인업, 날짜별 출연진 등을 읽어낸다.

**NOL 상세 이미지도 확인**: 포스터가 티저(아티스트 없음)인 경우가 있다. NOL은 상세 정보 이미지가 별도로 있을 수 있다:
- `https://ticketimage.interpark.com/Play/image/etc/26/{externalId}_p_01.gif` (상세 이미지 1)
- `https://ticketimage.interpark.com/Play/image/etc/26/{externalId}_p_02.gif` (상세 이미지 2)
이 URL들도 시도해서 라인업 이미지가 있는지 확인한다.

### 아티스트 정보 수집 우선순위

아래 순서로 시도하고, 확인된 정보를 종합한다:

1. **fetcher의 `artistNames`** — 이미 추출된 이름 (가장 신뢰도 높음)
2. **포스터/상세 이미지 분석** — Read 도구로 이미지를 보고 라인업 추출
3. **제목에서 Claude 식별** — 제목의 아티스트명을 Claude 지식으로 판단
4. **DB 기존 아티스트 매칭** — `GET /artists` 목록과 대조

### 페스티벌 라인업 적극 파악

페스티벌(FESTIVAL)은 아티스트 정보가 핵심인데, fetcher가 라인업을 못 가져오는 경우가 많다.
이때 **반드시** 추가 조사를 한다:

1. **포스터/상세 이미지 분석** (위 섹션 참조) — 라인업 포스터에서 출연진 추출.
2. **Claude 지식 활용** — 페스티벌 성격 파악, 기존 라인업 경험 활용.
3. **확실한 아티스트만 등록** — 이미지에서 명확히 읽히는 이름만. 추측 금지.

이 과정을 거쳐도 아티스트를 특정할 수 없으면 아티스트 없이 등록하되, 결과 보고에서 "⚠ 아티스트 미확인 — 수동 확인 필요"로 표시한다.

### 장르 보정

fetcher가 `"OTHER"`로 반환하는 경우가 많다. 제목과 공연장 정보를 보고 적절한 장르로 보정한다:

| 단서 | 장르 |
|------|------|
| "콘서트", "단독", "내한", "라이브", "LIVE", "TOUR" | `CONCERT` |
| "뮤지컬", "Musical" | `MUSICAL` |
| "연극", "단막극" | `PLAY` |
| "클래식", "오케스트라", "리사이틀" | `CLASSIC` |
| "페스티벌", "Festival", 다수 아티스트 출연 | `FESTIVAL` |
| "버스킹", "거리 공연" | `BUSKING` |
| "발매", "쇼케이스", "팬미팅" | `RELEASE` |
| LCK, 스포츠, 전시, 기타 비공연 | `OTHER` (등록은 하되 낮은 우선순위) |

### 공연 정보 보완

fetcher 데이터에 빈 필드가 있으면 네가 채울 수 있는 건 채운다:

- **subtitle**: 없으면 대괄호/꺽쇠 안의 부제목을 추출. 예: `"YENA LIVE TOUR [잡힐 듯 말 듯 한, 2세계!]"` → subtitle: `"잡힐 듯 말 듯 한, 2세계!"`
- **status 매핑**: fetcher의 `salesStatus` 문자열을 PerformanceStatus enum으로:
  - `"SOLD_OUT"` → `SOLD_OUT`
  - `"COMPLETED"` or 공연 날짜가 과거 → `COMPLETED`
  - `"CANCELLED"` → `CANCELLED`
  - `"ON_SALE"` → `ON_SALE`
  - 그 외 or 티켓 오픈 전 → `SCHEDULED`
- **lineupMode**: 페스티벌이면 `TIMETABLE`, 일반 콘서트면 `LINEUP`.

### 중복 매칭 판단

제목 정규화 + 날짜 비교만으로 부족할 때, 네 판단이 필요하다:
- `"2026 YENA LIVE TOUR In Seoul"` (멜론) vs `"2026 YENA LIVE TOUR ［잡힐 듯 말 듯 한, 2세계!］ In Seoul"` (NOL) → 같은 공연
- `"김승주 콘서트"` vs `"현대카드 Curated 104 김승주"` → 같은 공연 (같은 날짜+같은 장소면)

기계적 문자열 비교로는 놓칠 수 있는 것을 네가 잡아준다.

## 아티스트 검색/생성

아티스트 이름이 확정되면:

1. **find-or-create**: `POST /artists/find-or-create` with `{"name": "아티스트명"}`.
   - 서버가 자동으로: DB 검색 → Spotify 매칭 → 풍부한 데이터로 생성.
   - 200: 기존 아티스트 반환.
   - 201: 새로 생성 (Spotify 이미지, 메타데이터 포함).
   - Spotify에 없는 아티스트는 이름만으로 생성됨.
2. 반환된 `id`를 모아 `PUT /performances/:id/artists` 호출:
   ```json
   {
     "artists": [
       { "artistId": "uuid-1", "performanceOrder": 1 },
       { "artistId": "uuid-2", "performanceOrder": 2 }
     ]
   }
   ```

더 이상 `GET /artists?search=` → `POST /artists`로 수동 생성할 필요 없음. find-or-create 하나로 끝.

## 중복 감지 (크로스 플랫폼)

새 공연을 등록하기 전, 글로벌 상태의 기존 공연들과 비교:

### 정규화 방법

```
normalizeTitle(title):
  1. 연도 패턴 제거 (2024~2030)
  2. 공백, 특수문자 제거
  3. 소문자 변환
  4. 결과 문자열 반환
```

### 매칭 조건 (3가지 모두 충족)

1. **제목**: 정규화된 제목이 80% 이상 겹침 (공통 부분문자열 비율).
2. **공연장**: 이름이 같음 (정규화 후 비교).
3. **날짜**: 스케줄 날짜 1개 이상 겹침.

### 매칭 시 처리

기존 performanceId에 새 소스를 추가한다.

`references/api-cheatsheet.md`의 "소스 추가" 엔드포인트 참조.
만약 `POST /performances/:id/sources` 엔드포인트가 없으면:
1. `apps/server/src/performance/performance.controller.ts`에 엔드포인트 추가.
2. `performance.service.ts`에 `addSource()` 메서드 추가.
3. 필요한 DTO 생성.
이 작업은 최초 1회만 필요하며, 엔드포인트가 이미 있으면 스킵.

소스 추가 후 글로벌 상태의 `sources` 배열 업데이트.

## 업데이트 체크

이미 등록된 (platform, externalId) 조합인 경우:

1. 플랫폼 상태의 `registered`에서 performanceId 조회.
   - 409 응답의 메시지에는 제목만 있고 performanceId는 없음. 반드시 로컬 상태에서 조회.
   - 로컬 상태에도 없으면 `GET /performances` 목록에서 source 매칭으로 찾기.
2. `GET /performances/:id`로 현재 DB 데이터 조회.
3. **변경 감지** (아래 필드 비교):
   - `status` (예: ON_SALE → SOLD_OUT)
   - `schedules` 목록 변경
   - `tickets` 가격/좌석 변경
   - `posterUrl` 변경
   - `salesStatus` 변경
4. 변경 있으면 → `PATCH /performances/:id`로 업데이트.
5. 없으면 → 스킵.

## FetchedPerformance → CreatePerformanceDto 변환

```
{
  title: fetched.title,
  subtitle: fetched.subtitle,
  genre: fetched.genre,
  ageRating: fetched.ageRating,
  runtime: fetched.runtime,
  intermission: fetched.intermission,
  posterUrl: fetched.posterUrl,
  status: fetched.source.salesStatus → PerformanceStatus 매핑,
  organizer: fetched.organizer,
  venueName: fetched.venue?.name,
  venueAddress: fetched.venue?.address,
  venueLatitude: fetched.venue?.latitude,
  venueLongitude: fetched.venue?.longitude,
  platform: fetched.source.platform,
  externalId: fetched.source.externalId,
  sourceUrl: fetched.source.sourceUrl,
  ticketOpenAt: fetched.source.ticketOpenAt,
  bookingEndAt: fetched.source.bookingEndAt,
  salesStatus: fetched.source.salesStatus,
  schedules: fetched.schedules,
  tickets: fetched.tickets
}
```

## 결과 보고

매 실행 완료 시 간결하게 요약:

```
[melon] 스캔 완료 (20개 탐색)
  + 등록 3건: 밴드A 단독콘서트, 밴드B 내한공연, 페스티벌C
  ↻ 업데이트 1건: 밴드D 콘서트 (ON_SALE → SOLD_OUT)
  ⊕ 병합 1건: 밴드E 콘서트 ← NOL 소스 추가
  · 스킵 12건 (404/무효)
  ✗ 실패 3건
  ★ 아티스트 신규 생성: 밴드A, 밴드B
```

## 제약 사항

1. **요청 딜레이 2초 이상** — 외부 서비스 rate limit 존중. sleep 2 삽입.
2. **API only** — curl로 REST API 호출. Prisma/DB 직접 접근 금지.
3. **서버 실행 필수** — 시작 시 healthcheck. 안 떠있으면 중단.
4. **seeds.json 공유** — `tools/autoparse/seeds.json`과 시드 데이터 공유. 새로 발견한 유효 ID는 seeds에도 추가.
5. **상태 파일 원자적 업데이트** — 읽기 → 수정 → 즉시 저장. 루프 중 크래시에도 진행상황 보존.
6. **에러 시 계속 진행** — 개별 ID 에러가 전체 스캔을 중단시키지 않음. 에러를 기록하고 다음 ID로.
