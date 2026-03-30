# 페스티벌 아티스트 관리 디자인 스펙

## 개요

어드민에서 공연(특히 페스티벌) 등록 시 다중 아티스트를 관리하는 기능. 라인업 모드(일자별 순서)와 타임테이블 모드(일자+스테이지+시간)를 지원한다.

## 데이터 모델 변경

### 새 Enum

```prisma
enum LineupMode {
  LINEUP
  TIMETABLE
}
```

### Performance 테이블

```prisma
model Performance {
  // ...기존 필드
  lineupMode  LineupMode?  // 페스티벌일 때만 사용. null = 일반 공연
}
```

### PerformanceArtist 테이블

```prisma
model PerformanceArtist {
  id                    String              @id @default(uuid())
  performanceId         String
  artistId              String
  performanceScheduleId String?             // NEW: 어느 Day에 속하는지 (FK → PerformanceSchedule)
  role                  String?             // 콘서트용: "메인", "게스트"
  stageName             String?             // 아티스트 활동명 (기존)
  stage                 String?             // 물리적 무대명 (NEW) — 타임테이블 모드에서 사용
  startTime             DateTime?           // 타임테이블 모드에서 사용
  endTime               DateTime?           // 타임테이블 모드에서 사용
  performanceOrder      Int?                // 라인업 모드에서 순서

  performanceSchedule   PerformanceSchedule? @relation(fields: [performanceScheduleId], references: [id])
  // ...기존 관계, unique constraint
}
```

`performanceScheduleId`는 아티스트를 특정 Day(회차)에 연결한다. 라인업/타임테이블 모드 모두에서 Day 그룹핑에 사용. null이면 미배정 상태.

### 필드 사용 패턴

| 모드 | performanceScheduleId | performanceOrder | startTime/endTime | stage |
|------|:---:|:---:|:---:|:---:|
| 라인업 | O (Day 그룹핑) | O | X | X |
| 타임테이블 (배정됨) | O (Day 그룹핑) | X | O | O |
| 타임테이블 (미배정) | X | X | X | X |
| 일반 콘서트 | X | X | X | X |

## 아티스트 검색 및 추가 플로우

### 검색 드롭다운 (공통)

공연 등록 폼과 상세 페이지 편집 모두에서 동일한 컴포넌트 사용.

1. 입력 필드에 아티스트 이름 타이핑
2. 드롭다운에 두 그룹 표시:
   - **DB 검색 결과** — 기존 등록된 아티스트 (이름, 이미지, Spotify 연결 여부)
   - **Spotify 검색 결과** — Spotify Search API (`/v1/search?type=artist&q=...`) 결과 (이름, 이미지, 월간 리스너)
3. DB 아티스트 클릭 → 즉시 공연에 연결
4. Spotify 아티스트 클릭 → `api.spotify.getArtist(id)`로 상세 fetch → `api.artists.create()`로 DB 생성 → 공연에 연결

### Spotify 검색 API 추가

기존 `/api/spotify?id=...` (아티스트 상세 조회)에 더해, 검색용 엔드포인트 추가:

```
GET /api/spotify/search?q={query}
```

- Spotify Web API `/v1/search?type=artist&q={query}&limit=5` 호출
- 응답: `{ artists: [{ name, spotifyId, imageUrl, monthlyListeners }] }`

## 페스티벌 모드 UI

### 모드 선택

- `genre === FESTIVAL` 일 때만 "라인업 형식" 토글 표시
- 두 버튼: **라인업** / **타임테이블**
- `Performance.lineupMode` 에 저장

### 라인업 모드

- 회차(`PerformanceSchedule`)에 등록된 날짜 기준으로 Day 자동 생성
- 각 Day 안에서 아티스트 목록 표시
- 드래그로 순서 변경 (`performanceOrder`)
- Day별로 "+ 아티스트 추가" 버튼

### 타임테이블 모드

#### 구조

```
Day 탭 (회차 날짜 기준)
  └─ 스테이지 탭 (아티스트의 stage 필드에서 파생)
       └─ 시간순 아티스트 목록 (startTime 기준 정렬)
  └─ 미배정 풀 (startTime이 null인 아티스트)
```

#### 미배정 풀

- 아티스트 추가 시 미배정 풀에 먼저 들어감
- 칩 형태로 표시 (아바타 + 이름 + "배정" 버튼)

#### 배정 팝오버

"배정" 클릭 시 팝오버에서:

1. **스테이지 선택** — 기존 스테이지 버튼 중 선택, 또는 "+ 새 스테이지" 클릭 시 이름 입력 → 탭 자동 생성
2. **시작/종료 시간** 입력
3. "배정" 클릭 → 해당 스테이지 타임테이블에 배치

#### 해제

- 배정된 아티스트의 "해제" 클릭 → `stage`, `startTime`, `endTime` null 처리 → 미배정 풀로 복귀

## 일반 콘서트 아티스트

- `genre !== FESTIVAL` 일 때는 모드 선택 없이 단순 리스트
- 아티스트 추가 + `role` 선택 (메인/게스트)
- `performanceOrder`, `startTime`, `endTime`, `stage` 미사용

## 상세 페이지 뷰

### 읽기 모드

- **라인업**: Day별 아티스트 아바타+이름 나열
- **타임테이블**: 스테이지별 그룹핑, 왼쪽 라인으로 시각 구분, 시간순 정렬
- **일반 콘서트**: 아티스트 목록 (role 표시)

### 편집 진입

- "편집" 버튼 클릭 → 등록 폼과 동일한 편집 UI 전환
- 기존 `PUT /performances/:id/artists` API 사용

## 관리 위치

| 위치 | 기능 |
|------|------|
| 공연 등록 폼 (`/performances/new`) | 아티스트 추가/삭제, 모드 선택, 순서/배정 관리 |
| 공연 상세 페이지 (`/performances/:id`) | 읽기 뷰 + "편집" 버튼으로 편집 UI 전환 |
| 공연 수정 페이지 (`/performances/:id/edit`) | 등록 폼과 동일한 편집 기능 |

## API 변경사항

### 새 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/spotify/search?q={query}` | Spotify 아티스트 이름 검색 |

### 기존 엔드포인트 수정

| Method | Path | 변경 |
|--------|------|------|
| POST | `/performances` | `lineupMode` 필드 추가 |
| PATCH | `/performances/:id` | `lineupMode` 필드 추가 |
| PUT | `/performances/:id/artists` | `stage` 필드 추가 |

### DTO 변경

`CreatePerformanceDto` / `UpdatePerformanceDto`:
- `lineupMode?: LineupMode` 추가

`ReplaceArtistsDto` 항목:
- `stage?: string` 추가
- `performanceScheduleId?: string` 추가

## 컴포넌트 구조

```
ArtistSearchInput          — 검색 입력 + DB/Spotify 드롭다운
ArtistCreateModal          — Spotify 선택 → 아티스트 생성 (기존 로직 재활용)
LineupEditor               — 라인업 모드 편집 (Day별 드래그 리스트)
TimetableEditor            — 타임테이블 모드 편집 (스테이지 탭 + 미배정 풀)
  └─ AssignPopover          — 스테이지+시간 배정 팝오버
LineupReadView             — 라인업 읽기 뷰
TimetableReadView          — 타임테이블 읽기 뷰
FestivalArtistSection      — 모드 토글 + LineupEditor/TimetableEditor 분기
ConcertArtistSection       — 일반 콘서트용 단순 리스트
```
