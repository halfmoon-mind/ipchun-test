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

1. **음악 공연만 등록** — 이 플랫폼은 인디 음악/아티스트 팬 플랫폼이다. 아래는 등록하지 않는다:
   - **장르 제외**: 뮤지컬, 연극, 클래식, 트로트 (서버가 `MUSICAL`, `PLAY`, `CLASSIC`, `TROT` 장르를 400으로 거부)
   - **키워드 제외**: 야구, 축구, 농구, 배구, 스포츠, KBO, KBL, K리그 등 스포츠 + 토크콘서트, 토크쇼, 강연, 세미나, 특강 등 비-음악 이벤트 + 트로트 (서버가 제목 키워드로 400 거부)
   - **스킬 레벨 사전 거절**: 서버 호출 전에도, 제목이나 장르로 비-음악 공연임이 명백하면 fetch 자체를 스킵한다. 특히 "토크콘서트"처럼 "콘서트"가 포함되어 있지만 실제로는 강연/교육 이벤트인 경우를 주의한다. 불필요한 API 호출을 줄인다.
2. **모든 DB 수정은 REST API** — Prisma 직접 호출 금지. curl로 API 호출.
3. **로컬 상태 추적** — `tools/register/data/{env}/`에 플랫폼별 JSON 상태 저장 (환경별 분리).
4. **아티스트 자동 생성** — DB에 없는 아티스트는 즉시 API로 생성.
5. **크로스 플랫폼 병합** — 동일 공연이 여러 플랫폼에 있으면 하나로 합침.
6. **기존 공연 업데이트** — 이미 등록된 공연은 변경사항 감지 후 PATCH.
7. **요청 딜레이 2초** — 외부 서비스 rate limit 존중.
8. **Claude 지능 활용** — 너는 단순 스크립트가 아니라 Claude다. fetcher가 반환한 데이터가 부족하면 제목·맥락을 보고 직접 판단하여 정보를 보완한다.
9. **CANCELLED 공연은 등록하지 않고, 발견하면 삭제한다** — 취소된 공연은 플랫폼에 남아 있어도 우리 DB에는 없어야 한다:
   - **신규 등록 시**: fetch 결과의 `salesStatus`가 `"CANCELLED"`이면 등록하지 않는다. explored에만 추가.
   - **업데이트 체크 시**: 기존 공연이 CANCELLED로 변경됐으면 `DELETE /performances/:id`로 삭제한다.
   - **상태 정리**: 삭제된 공연은 `registered`에 `{ "performanceId": null, "deleted": true, "reason": "CANCELLED" }` 형태로 남겨 재등록을 방지하고, `seeds`에서 제거한다.
   - 글로벌 상태에서도 해당 performanceId 엔트리를 삭제한다.

## API 환경

- 로컬: `http://localhost:3000`
- 프로덕션: `https://api.ipchun.live`

### 환경 감지 및 데이터 분리

local DB와 prod DB는 ID 체계가 완전히 다르다. 한쪽에서 등록한 performanceId가 다른 쪽에는 존재하지 않으므로, 상태 파일을 환경별로 분리해야 한다.

**스캔 시작 전 필수 절차:**

1. localhost 서버 확인:
```bash
curl -s "http://localhost:3000/health"
```
2. 응답의 `env` 값으로 환경 결정:
   - `{"env": "local"}` → `BASE_URL=http://localhost:3000`, `DATA_DIR=tools/register/data/local/`
   - `{"env": "production"}` → `BASE_URL=http://localhost:3000`, `DATA_DIR=tools/register/data/prod/`
3. localhost가 응답하지 않으면 → `BASE_URL=https://api.ipchun.live`, `DATA_DIR=tools/register/data/prod/`
4. 둘 다 안 되면 중단하고 사용자에게 알림.

스캔 시작 시 환경을 명시한다:
```
🔧 환경: local (localhost:3000 → local DB) → data/local/
```
또는
```
🌐 환경: prod (localhost:3000 → prod DB) → data/prod/
```

DATA_DIR이 비어있으면 빈 상태로 초기화한다 (새 환경 첫 실행).

API 엔드포인트 상세는 `references/api-cheatsheet.md` 참조.

## 상태 파일

```
tools/register/data/
├── shared/              # 환경 무관 — 플랫폼별 스킵 목록
│   ├── melon.json
│   ├── nol.json
│   ├── ticketlink.json
│   └── yes24.json
├── local/               # 로컬 DB 상태
│   ├── global.json
│   ├── melon.json
│   ├── nol.json
│   ├── ticketlink.json
│   └── yes24.json
└── prod/                # 프로덕션 DB 상태
    ├── global.json
    ├── melon.json
    ├── nol.json
    ├── ticketlink.json
    └── yes24.json
```

### 공유 스킵 스키마 (`shared/{platform}.json`)

환경과 무관한 스킵 판단을 기록한다. 외부 플랫폼 ID는 환경이 달라도 동일한 공연을 가리키므로, 한 환경에서 스킵된 공연은 다른 환경에서도 스킵해야 한다.

```json
{
  "12345": { "reason": "400_EXCLUDED", "title": "뮤지컬 제목" },
  "12346": { "reason": "CANCELLED", "title": "취소된 공연" },
  "12347": { "reason": "MANUAL_SKIP", "title": "토크콘서트", "note": "비음악" }
}
```

- **`reason` 값**: `400_EXCLUDED` (장르/키워드 서버 거부), `CANCELLED` (취소), `MANUAL_SKIP` (수동 판단)
- **기록 시점**: fetch 결과가 400이거나, salesStatus가 CANCELLED이거나, 비음악 이벤트로 판단될 때
- **사용 시점**: fetch 전에 이 파일을 확인하여, 이미 스킵된 ID는 API 호출 없이 건너뛴다

### 플랫폼 상태 스키마 (`{env}/{platform}.json`)

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
   - 400 Bad Request → **등록 제외 대상** (뮤지컬/연극/클래식/스포츠). 스킵.
   - 409 Conflict → 이미 등록됨. 응답에서 기존 정보 확인 후 **업데이트 체크**로.
   - 성공 → `FetchedPerformance` 획득.
2. **CANCELLED 체크**: `salesStatus`가 `"CANCELLED"`이면 → 등록하지 않는다. "취소된 공연 — 스킵" 보고 후 종료.
3. **데이터 보완** (Claude 지능 활용 섹션 참조):
   - 장르 보정 (OTHER → 적절한 장르)
   - subtitle 추출
   - status/lineupMode 결정
4. **중복 체크**: 글로벌 상태에서 크로스 플랫폼 매칭 (→ 중복 감지 섹션).
5. **등록**: `FetchedPerformance`를 `CreatePerformanceDto`로 변환하여 `POST /performances`. 반환된 `id`를 반드시 저장.
6. **아티스트 처리 (필수 — 절대 스킵하지 않는다)**:
   a. `artistNames`에 값이 있으면 → 그대로 사용.
   b. 비어있으면 → **반드시** 아래 소스를 **전부** 시도하여 아티스트를 찾는다:
      - 포스터/상세 이미지를 WebFetch → Read로 직접 보고 아티스트 추출
      - 티켓 페이지를 WebFetch로 확인하여 출연진 목록 추출
      - 제목에서 Claude 지식으로 아티스트 식별
   c. 페스티벌이면 → 라인업 전체를 적극적으로 파악. 포스터 이미지 분석은 **필수**.
   d. 식별된 **모든** 아티스트를 `POST /artists/find-or-create` 로 생성/조회.
   e. `PUT /performances/:id/artists` 로 연결. **이 단계를 빠뜨리면 아티스트 없는 공연이 된다.**
   f. 아티스트가 1명이라도 빠지면 안 된다. 10명이 보이면 10명 전부 등록한다.
7. **타임테이블 배치** (lineupMode가 TIMETABLE이면 — 아래 "타임테이블 자동 배치" 섹션 참조)
8. **상태 업데이트**: 플랫폼 상태 + 글로벌 상태 저장.

### Mode B: 플랫폼 스캔

1. **상태 로드**: `{DATA_DIR}/{platform}.json` + `shared/{platform}.json` 둘 다 로드 (없으면 빈 상태로 초기화).
2. **ID 선정**: 20개 미탐색 ID 선택. **공유 스킵 목록에 있는 ID도 explored 취급하여 제외한다.**
   - autoparse의 `tools/autoparse/seeds.json`에서 시드 가져오기.
   - seeds에서 인접 ID(±50 범위) 생성.
   - explored에 없는 것만 사용.
3. **Fetch-Process 파이프라인** — fetch는 순차(2초 딜레이), 후처리는 백그라운드 병렬:

   외부 rate limit을 위해 fetch는 순차로 하되, 성공한 건의 후처리(등록/아티스트/타임테이블)는 **백그라운드 Agent(`run_in_background: true`)**에 위임한다. fetch 대기 시간과 처리 시간이 겹치므로 전체 소요 시간이 대폭 단축된다.

   ```
   Main:      fetch(1) →2s→ fetch(2) →2s→ fetch(3) →2s→ fetch(4) ...
   Agent-1:     └── register(1) → artists(병렬) → timetable
   Agent-2:            └── update-check(2) → artists 보완
   Agent-3:                   └── register(3) → artists(병렬)
   ```

   **Fetch 루프 (메인 에이전트)**:
   a. **공유 스킵 체크**: `shared/{platform}.json`에 해당 ID가 있으면 → fetch 없이 explored에 추가, 스킵. "공유 스킵: {title} ({reason})" 보고.
   b. URL 조립 (플랫폼별 템플릿) → `POST /performances/fetch`.
   c. **400 Bad Request** → 등록 제외 대상 (뮤지컬/연극/클래식/스포츠). explored에 추가, **`shared/{platform}.json`에 기록** (`reason: "400_EXCLUDED"`), 스킵.
   d. **404/500/네트워크 에러** → explored에 추가, 스킵. (서버가 Prisma P2025를 404로 반환. 외부 플랫폼 에러는 500). 404는 공유 스킵에 기록하지 않는다 (ID가 존재하지 않는 것이지 스킵 판단이 아님).
   e. **409 Conflict** → explored에 추가. `registered`에서 performanceId 조회 → **백그라운드 Agent** 디스패치 (업데이트 체크).
      - 409 메시지 형식: `"이미 등록된 공연입니다: \"제목\" (PLATFORM ID)"`.
   f. **200 성공** → `salesStatus`가 `"CANCELLED"`이면 explored에만 추가하고 **`shared/{platform}.json`에 기록** (`reason: "CANCELLED"`), 스킵. 아니면 explored + seeds에 추가, **백그라운드 Agent** 디스패치 (신규 등록 전체 처리).
   g. `sleep 2` → 다음 ID.

   **백그라운드 Agent 프롬프트 (200 → 신규 등록)**:
   ```
   공연 등록 처리. API: {baseUrl}
   fetchedData: {fetch 응답 JSON 전체}

   1. 데이터 보완: 장르 보정(OTHER→적절값), subtitle 추출, status 매핑, organizer 정제(주최명만)
   2. POST /performances 로 등록
   3. 아티스트 식별 (제목 + 상세 이미지 분석)
      → POST /artists/find-or-create 를 병렬 curl(&+wait)로 동시 호출
      → PUT /performances/:id/artists
   4. lineupMode=TIMETABLE이면 타임테이블 배치 (scheduleId 매칭)
   5. 반드시 status와 salesStatus를 쌍으로 설정
   6. 결과 반환: {performanceId, title, artists: [...], action: "created"|"merged"}
   ```

   **백그라운드 Agent 프롬프트 (409 → 업데이트 체크)**:
   ```
   기존 공연 업데이트 체크. API: {baseUrl}, performanceId: {id}
   fetchedData: {fetch 응답 JSON}

   1. fetch 데이터의 salesStatus가 "CANCELLED"이면 → DELETE /performances/:id 로 삭제하고 즉시 종료.
      결과 반환: {performanceId, title, action: "deleted", reason: "CANCELLED"}
   2. GET /performances/:id 로 현재 상태 ��회
   3. 변경 감지: status+salesStatus(쌍으로), schedules, tickets, posterUrl
   4. 변경 시 PATCH (status 변경이면 반드시 salesStatus도 함께)
   5. 아티스트 누락 확인 → 추가 등록 (병렬 curl)
   6. TIMETABLE인데 미배치면 타임테이블 배치
   7. 결과 반환: {performanceId, title, action: "updated"|"unchanged"}
   ```

   **상태 통합** — 모든 백그라운드 Agent 완료 후 메인이 일괄 처리:
   - 각 Agent 결과 수집.
   - `action: "deleted"` → `registered`에 `{ "performanceId": null, "deleted": true, "reason": "CANCELLED" }` 기록, `seeds`에서 해당 ID 제거, 글로벌 상태에서 performanceId 엔트리 삭제.
   - `action: "created"/"merged"` → 플랫폼 상태 `registered`에 performanceId 매핑 추가.
   - 글로벌 상태에 신규 공연 추가 / sources 병합.
   - 상태 파일 한 번에 저장.
4. **결과 보고**.

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
  "{DATA_DIR}/{platform}.json 상태를 로드하고,
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
3. **페스티벌** → 출연진이 여러 명이면 가능한 만큼 식별. 모르면 무리하지 않는다.

핵심: regex가 아니라 **네 지식**을 쓴다. "YENA"가 최예나라는 걸 알고, "문별"이 마마무 멤버라는 걸 아는 것이 단순 패턴 매칭과의 차이다.

### 상세 이미지 수집 & 분석

티켓 플랫폼의 상세 페이지에는 공연 정보 이미지가 포함되어 있다. 이 이미지들이 아티스트 라인업, 타임테이블, 스테이지 배치의 **가장 정확한 소스**다. fetcher의 `artistNames`는 헤드라이너만 포함하는 경우가 많으므로, 상세 이미지 분석을 반드시 병행한다.

#### 이미지 URL 수집

플랫폼별로 상세 이미지를 담는 위치가 다르다:

- **NOL**: summary API 응답의 `contentHtml` 필드에 `<img src="...">` 태그로 포함.
  ```bash
  curl -s 'https://api-ticketfront.interpark.com/v1/goods/{externalId}/summary' \
    -H 'Referer: https://tickets.interpark.com/goods/{externalId}' \
    -H 'User-Agent: Mozilla/5.0' -H 'Accept: application/json'
  ```
  응답의 `data.contentHtml`에서 모든 img src URL을 추출한다.
- **기타 플랫폼**: `posterUrl`을 기본으로 사용. 추가 이미지 소스가 있으면 활용.

#### 병렬 이미지 다운로드 & 분석

이미지가 여러 장이면 **WebFetch를 병렬로 호출**하여 동시에 다운로드한다. 이미지 분석도 가능한 한 병렬로 처리한다:

```
# 1단계: 모든 이미지를 병렬 WebFetch로 동시 다운로드
WebFetch(url: imageUrl1, prompt: "이미지 저장")  ─┐
WebFetch(url: imageUrl2, prompt: "이미지 저장")  ─┤  동시 호출
WebFetch(url: imageUrl3, prompt: "이미지 저장")  ─┘

# 2단계: 다운로드된 파일들을 병렬 Read로 동시 분석
Read(file_path: "/path/to/img1.jpg")  ─┐
Read(file_path: "/path/to/img2.jpg")  ─┤  동시 호출
Read(file_path: "/path/to/img3.jpg")  ─┘
```

각 이미지를 보고 다음을 추출한다:
- **라인업 이미지**: 날짜별 아티스트 목록
- **타임테이블 이미지**: 스테이지별 시간표 (아티스트, 시작/종료 시각, 스테이지명)
- **안내 이미지**: 스킵 (예매 안내, 교통 안내 등)

#### 이미지 정리 (필수)

분석이 끝난 이미지는 **즉시 삭제**한다. WebFetch로 다운로드된 임시 파일이 로컬에 쌓이는 것을 방지하기 위해, Read로 분석을 마친 직후 Bash로 삭제한다:

```
# 3단계: 분석 완료 후 임시 이미지 파일 일괄 삭제
Bash(command: "rm -f /path/to/img1.jpg /path/to/img2.jpg /path/to/img3.jpg")
```

- 공연 **1건 처리가 끝날 때마다** 해당 공연에서 다운로드한 이미지를 모두 삭제한다.
- 삭제 대상은 WebFetch가 반환한 파일 경로들이다. 경로를 변수처럼 기억해두고 분석 후 한꺼번에 `rm -f`한다.
- 루프 모드(`/loop`)에서 수십~수백 건을 처리할 때 특히 중요하다.

#### 아티스트 정보 종합

여러 소스에서 아티스트를 수집하고 합집합을 만든다. 하나에서 찾았다고 멈추지 않는다:

1. **상세 이미지 분석** — 가장 완전한 소스. 타임테이블 이미지에 전체 라인업 + 시간 + 스테이지가 있다.
2. **fetcher의 `artistNames`** — 상세 이미지에 없는 아티스트가 여기에 있을 수 있다.
3. **제목에서 Claude 식별** — 솔로 콘서트 등 단일 아티스트 공연에 유용.
4. **결과 종합** — 합집합으로 모으고, 중복 제거 후 전부 등록. 이미지에서 명확히 읽히는 이름만 등록하고 추측은 하지 않는다.

아티스트를 특정할 수 없으면 아티스트 없이 등록하되, 결과 보고에서 "⚠ 아티스트 미확인 — 수동 확인 필요"로 표시한다.

### 등록 제외 대상

서버가 fetch 단계에서 자동 필터링한다. 아래 대상은 `400 Bad Request`로 거부된다:

- **장르 제외**: `MUSICAL`, `PLAY`, `CLASSIC`, `TROT` — 인디 음악 플랫폼 도메인에 맞지 않음
- **제목 키워드 제외**: 야구, 축구, 농구, 배구, 스포츠, KBO, KBL, K리그 등 스포츠 관련

스캔 중 400을 받으면 explored에 추가하고 스킵한다. 에러가 아니라 정상적인 제외 처리다.

### 장르 보정

fetcher가 `"OTHER"`로 반환하는 경우가 많다. 제목과 공연장 정보를 보고 적절한 장르로 보정한다:

| 단서 | 장르 |
|------|------|
| "콘서트", "단독", "내한", "라이브", "LIVE", "TOUR" | `CONCERT` |
| "페스티벌", "Festival", 다수 아티스트 출연 | `FESTIVAL` |
| "버스킹", "거리 공연" | `BUSKING` |
| "발매", "쇼케이스", "팬미팅" | `RELEASE` |

> 뮤지컬/연극/클래식/스포츠는 서버에서 자동 제외되므로 보정 대상이 아니다.

### 공연 정보 보완

fetcher 데이터에 빈 필드가 있으면 네가 채울 수 있는 건 채운다:

- **subtitle**: 없으면 대괄호/꺽쇠 안의 부제목을 추출. 예: `"YENA LIVE TOUR [잡힐 듯 말 듯 한, 2세계!]"` → subtitle: `"잡힐 듯 말 듯 한, 2세계!"`
- **status 매핑**: fetcher의 `salesStatus` 문자열을 PerformanceStatus enum으로:
  - `"SOLD_OUT"` → `SOLD_OUT`
  - `"COMPLETED"` or 공연 날짜가 과거 → `COMPLETED`
  - `"CANCELLED"` → `CANCELLED`
  - `"ON_SALE"` → `ON_SALE`
  - 그 외 or 티켓 오픈 전 → `SCHEDULED`
  - **`status`와 `salesStatus`는 반드시 함께 업데이트한다.** performance 레벨의 `status`만 바꾸고 source 레벨의 `salesStatus`를 방치하면 데이터 불일치가 생긴다. 특히 공연 날짜가 지난 경우 `{"status": "COMPLETED", "salesStatus": "COMPLETED"}`를 한 번의 PATCH에 함께 보낸다.
- **lineupMode**: 페스티벌이면 `TIMETABLE`, 일반 콘서트면 `LINEUP`.
- **organizer 정제**: fetcher의 `organizer`는 플랫폼에 따라 raw 비즈니스 정보 전체가 들어있을 수 있다. 특히 NOL은 `bizInfo` 필드를 그대로 반환하므로 주최/주관/문의가 뒤섞여 있다:
  ```
  "주최 : YH ENTERTAINMENT\r\n주관 : COMPANY Z\r\n문의 : 1544-1555"
  ```
  이런 경우 **주최 이름만 추출**해서 저장한다:
  - `"주최 : A\r\n주관 : B\r\n문의 : C"` → `"A"`
  - `"주최 : A / 주관 : B"` → `"A"`
  - 주최 패턴이 없고 단순 텍스트면 → 그대로 사용
  - 빈 문자열이나 문의 번호만 있으면 → `null`

### 중복 매칭 판단

제목 정규화 + 날짜 비교만으로 부족할 때, 네 판단이 필요하다:
- `"2026 YENA LIVE TOUR In Seoul"` (멜론) vs `"2026 YENA LIVE TOUR ［잡힐 듯 말 듯 한, 2세계!］ In Seoul"` (NOL) → 같은 공연
- `"김승주 콘서트"` vs `"현대카드 Curated 104 김승주"` → 같은 공연 (같은 날짜+같은 장소면)

기계적 문자열 비교로는 놓칠 수 있는 것을 네가 잡아준다.

## 아티스트 검색/생성

아티스트 이름이 확정되면:

1. **find-or-create**: `POST /artists/find-or-create` with `{"name": "아티스트명"}`.
   - 서버가 자동으로: DB 검색 → Spotify 검색 → 가장 관련성 높은 결과로 생성.
   - 200: 기존 아티스트 반환.
   - 201: 새로 생성 (Spotify 데이터 포함).
   - Spotify 검색 결과가 없으면 이름만으로 생성되지만, 이는 바람직하지 않다 — 반드시 오매칭 폴백을 먼저 시도.
   - Spotify 검색 알고리즘이 한글명→로마자 활동명도 매칭해주므로, 별도 로마자 변환 불필요.
   - **중요**: 식별된 아티스트가 10명이면 10번 호출한다. 한 명도 빠뜨리지 않는다.
   - **⚠ Spotify 오매칭 폴백**: `find-or-create`가 다른 아티스트를 반환하면 (예: "킥"으로 검색했는데 "KickFlip" 반환) 아래 수동 절차를 따른다:
     1. Spotify 직접 검색: `GET /artists/spotify/search?q={정확한 아티스트명}` — 여러 표기를 시도 (영문명, 한글명).
     2. 결과에서 올바른 아티스트의 `spotifyId` 확인.
     3. Spotify 상세 조회: `GET /artists/spotify/{spotifyId}` — name, imageUrl, genres 확인.
     4. 직접 생성: `POST /artists` with `{"name": "...", "spotifyId": "...", "imageUrl": "...", "genres": [...]}`.
     5. Spotify 검색에도 없으면 → 생성하지 않고 결과 보고에 "⚠ Spotify 미매칭 — 수동 확인 필요"로 표시. 임의 생성은 지양한다.
   - **병렬 호출**: 아티스트가 2명 이상이면 find-or-create를 **동시 실행**한다. 내부 API이므로 딜레이 불필요:
     ```bash
     curl -s -X POST $BASE_URL/artists/find-or-create -H "Content-Type: application/json" -d '{"name":"아티스트A"}' > /tmp/ar_1.json &
     curl -s -X POST $BASE_URL/artists/find-or-create -H "Content-Type: application/json" -d '{"name":"아티스트B"}' > /tmp/ar_2.json &
     curl -s -X POST $BASE_URL/artists/find-or-create -H "Content-Type: application/json" -d '{"name":"아티스트C"}' > /tmp/ar_3.json &
     wait
     # 결과에서 id 수집
     ```
     20명 페스티벌 라인업: ~40초 → ~2초.
2. 반환된 `id`를 모아 `PUT /performances/:id/artists` 호출:
   ```json
   {
     "artists": [
       {
         "artistId": "uuid-1",
         "performanceOrder": 1,
         "performanceScheduleId": "schedule-uuid",
         "startTime": "2026-05-01T15:00:00+09:00",
         "endTime": "2026-05-01T15:40:00+09:00",
         "stage": "MAIN STAGE"
       },
       { "artistId": "uuid-2", "performanceOrder": 2 }
     ]
   }
   ```
   - LINEUP 모드: `artistId` + `performanceOrder`만 사용.
   - TIMETABLE 모드: 타임테이블 필드 (`performanceScheduleId`, `startTime`, `endTime`, `stage`)도 함께 채운다. → 아래 "타임테이블 자동 배치" 섹션 참조.

## 타임테이블 자동 배치

`lineupMode`가 `TIMETABLE`인 공연 (주로 페스티벌, 다일 콘서트 등)에서는 아티스트를 단순히 연결하는 것에서 끝나지 않는다. **어떤 날에, 어떤 스테이지에서, 몇 시에 공연하는지**를 배치해야 한다. 이 정보가 없으면 프론트엔드의 타임테이블 뷰가 빈 화면이 된다.

### 타임테이블 데이터 수집

위 "상세 이미지 수집 & 분석"에서 이미 이미지를 분석했다면 거기서 얻은 타임테이블 정보를 사용한다. 추가로 필요하면:

1. **상세 이미지** — 타임테이블 그리드 이미지가 가장 정확한 소스. 스테이지별 시간표가 들어있다.
2. **포스터** — 날짜별 라인업 요약이 있을 수 있다.
3. **Claude 지식** — 유명 페스티벌이면 과거 패턴을 참고할 수 있다.

### 배치 규칙

1. **performanceScheduleId 필수**: 각 아티스트를 해당 공연 날짜의 `schedule.id`에 연결한다.
   - 공연 생성 후 `GET /performances/:id` 응답의 `schedules` 배열에서 날짜별 `id`를 확인.
   - Day 1 출연 아티스트 → Day 1 schedule의 id, Day 2 아티스트 → Day 2 schedule의 id.
2. **startTime / endTime**: 시간 정보가 있으면 반드시 채운다. ISO 8601 형식 (`2026-05-01T15:00:00+09:00`).
3. **stage**: 스테이지가 여러 개면 반드시 스테이지 이름을 채운다 (예: "MAIN STAGE", "GREEN STAGE").
4. **performanceOrder**: 같은 날, 같은 스테이지 내에서 출연 순서.

### 타임테이블 정보가 부족한 경우

- **날짜만 알고 시간을 모르면** → `performanceScheduleId`만 채우고, `startTime`/`endTime`은 null.
- **날짜도 모르고 아티스트만 알면** → 일단 `performanceScheduleId` 없이 등록. 나중에 업데이트.
- **타임테이블 정보를 전혀 찾을 수 없으면** → 결과 보고에 "⚠ 타임테이블 미배치 — 수동 확인 필요" 표시.

### 예시: 2일 페스티벌

공연 생성 후 schedules가 `[{id: "s1", dateTime: "Day1"}, {id: "s2", dateTime: "Day2"}]`인 경우:

```json
{
  "artists": [
    {"artistId": "a1", "performanceScheduleId": "s1", "performanceOrder": 1, "startTime": "..T14:00:00+09:00", "endTime": "..T14:40:00+09:00", "stage": "MAIN"},
    {"artistId": "a2", "performanceScheduleId": "s1", "performanceOrder": 2, "startTime": "..T15:00:00+09:00", "endTime": "..T15:40:00+09:00", "stage": "MAIN"},
    {"artistId": "a3", "performanceScheduleId": "s2", "performanceOrder": 1, "startTime": "..T14:00:00+09:00", "endTime": "..T14:40:00+09:00", "stage": "MAIN"},
    {"artistId": "a4", "performanceScheduleId": "s2", "performanceOrder": 2, "startTime": "..T15:00:00+09:00", "endTime": "..T15:40:00+09:00", "stage": "MAIN"}
  ]
}
```

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
   - `registered`에 `"deleted": true`가 있으면 → 이미 삭제된 공연. 스킵.
   - 로컬 상태에도 없으면 `GET /performances` 목록에서 source 매칭으로 찾기.
2. **CANCELLED 체크**: fetch 데이터의 `salesStatus`가 `"CANCELLED"`이면 → `DELETE /performances/:id`로 삭제. `registered`를 `{ "performanceId": null, "deleted": true, "reason": "CANCELLED" }`로 갱신, `seeds`에서 제거, 글로벌 상태에서 엔트리 삭제. 이후 단계 스킵.
3. `GET /performances/:id`로 현재 DB 데이터 조회.
   - **404** → 이미 삭제된 공연. `registered`를 `{ "performanceId": null, "deleted": true, "reason": "NOT_FOUND" }`로 갱신, 글로벌 상태에서 엔트리 삭제. 이후 단계 스킵.
4. **변경 감지** (아래 필드 비교):
   - `status` + `salesStatus` (이 둘은 항상 쌍으로 비교·업데이트. 예: 공연 종료 시 `{"status": "COMPLETED", "salesStatus": "COMPLETED"}`)
   - `schedules` 목록 변경
   - `tickets` 가격/좌석 변경
   - `posterUrl` 변경
   - 공연 날짜가 모두 과거인데 status가 COMPLETED가 아니면 → 자동으로 COMPLETED 처리
5. 변경 있으면 → `PATCH /performances/:id`로 업데이트. status 변경 시 반드시 `status`와 `salesStatus` 둘 다 포함.
6. **아티스트 & 타임테이블 보완 (409인 기존 공연도 반드시 체크)**:
   - 기존 artists 수와 fetcher의 artistNames 수를 비교. 누락된 아티스트가 있으면 추가 등록.
   - lineupMode가 TIMETABLE인데 artists의 `performanceScheduleId`가 전부 null이면 → 타임테이블 배치 실행 (→ "타임테이블 자동 배치" 섹션).
   - 이미 배치된 아티스트는 건드리지 않고, 미배치 아티스트만 업데이트.
7. 없으면 → 스킵.

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
  organizer: fetched.organizer → 정제 (위 "organizer 정제" 참조),
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
  ✕ 삭제 1건: 밴드F 콘서트 (CANCELLED)
  · 스킵 12건 (404/무효/취소) — 이 중 공유 스킵 3건
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
