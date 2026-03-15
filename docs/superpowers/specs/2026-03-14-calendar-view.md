# Calendar View - PRD

## Overview

모바일 앱에서 아티스트의 일정(버스킹, 콘서트, 페스티벌 등)을 **월간 캘린더** 형태로 보여주는 기능. 날짜를 선택하면 해당 날짜의 일정 리스트가 표시되고, 일정을 탭하면 바텀시트로 요약 정보를 보여준 뒤 상세 페이지로 이동할 수 있다.

## Goals

- 사용자가 한눈에 월별 일정 분포를 파악할 수 있다
- 일정 타입(콘서트, 버스킹, 페스티벌 등)을 색상으로 직관적으로 구분할 수 있다
- 날짜 선택 → 일정 리스트 → 바텀시트 → 상세 페이지의 자연스러운 탐색 흐름을 제공한다

## Target User

모바일 앱 사용자 (팬)

## Prerequisites / Known Issues

> 캘린더 구현 전에 인지해야 할 기존 코드 문제들

### 1. `@ipchun/shared` Schedule 타입 불일치

`packages/shared/src/index.ts`의 `Schedule` 인터페이스에 `artistId: string` 필드가 있으나, 실제 Prisma 스키마의 `Schedule` 모델에는 `artistId` 컬럼이 **없다**. Schedule은 `ScheduleLineup`을 통해 아티스트와 다대다(M:N) 관계이므로, shared 타입에서 `artistId` 필드를 제거해야 한다.

**수정 필요:**
```typescript
// packages/shared/src/index.ts
export interface Schedule {
  id: string;
  // artistId: string; ← 제거
  title: string;
  description: string | null;
  type: ScheduleType;
  startDate: string;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 2. `schedule.service.ts` 및 DTO 쿼리 오류

기존 `schedule.service.ts`에서:
- `include: { artist: true }` — Schedule에 직접적인 `artist` 관계가 없음 (`lineups`를 통해서만 접근 가능)
- `findByArtist(artistId)` → `where: { artistId }` — Schedule에 `artistId` 컬럼이 없음
- `create(dto)` → `prisma.schedule.create({ data: dto })` — DTO에 `artistId`가 포함되어 있으나 Schedule 모델에 해당 컬럼이 없어 런타임 에러 발생

**수정 필요:**
```typescript
// 기존 (잘못됨)
findAll() {
  return this.prisma.schedule.findMany({
    include: { artist: true },
  });
}
findByArtist(artistId: string) {
  return this.prisma.schedule.findMany({
    where: { artistId },
  });
}

// 수정 (올바름)
findAll() {
  return this.prisma.schedule.findMany({
    include: { lineups: { include: { artist: true } } },
    orderBy: { startDate: 'asc' },
  });
}
findByArtist(artistId: string) {
  return this.prisma.schedule.findMany({
    where: { lineups: { some: { artistId } } },
    include: { lineups: { include: { artist: true } } },
    orderBy: { startDate: 'asc' },
  });
}
```

### 3. `CreateScheduleDto` + 어드민 일정 등록 오류

`CreateScheduleDto`에 `artistId` 필드가 있고, 어드민 페이지(`schedules/new/page.tsx`)에서도 `artistId`를 전송한다. 하지만 Schedule 모델에 `artistId`가 없으므로 일정 생성이 동작하지 않는다.

**수정 방안:** 일정 생성 시 Schedule + ScheduleLineup을 트랜잭션으로 함께 생성하도록 변경:
```typescript
// schedule.service.ts
async create(dto: CreateScheduleDto) {
  const { artistId, ...scheduleData } = dto;
  return this.prisma.$transaction(async (tx) => {
    const schedule = await tx.schedule.create({ data: scheduleData });
    if (artistId) {
      await tx.scheduleLineup.create({
        data: { scheduleId: schedule.id, artistId },
      });
    }
    return tx.schedule.findUnique({
      where: { id: schedule.id },
      include: { lineups: { include: { artist: true } } },
    });
  });
}
```

## Feature Specification

### 1. 캘린더 뷰 (월간)

#### 1.1 레이아웃
- **헤더**: 현재 연/월 표시 + 좌/우 화살표로 월 이동
- **요일 헤더**: 일 ~ 토 (한국어)
- **날짜 그리드**: 6주 x 7일 그리드
  - 현재 월이 아닌 날짜는 흐리게 표시
  - 오늘 날짜는 강조 표시 (배경색 또는 테두리)
  - 선택된 날짜는 별도 강조

#### 1.2 일정 표시 (도트)
- 각 날짜 셀에 해당일의 일정 존재 여부를 **색상 도트**로 표시
- 일정 타입별 색상:
  | ScheduleType | 색상 | 용도 |
  |---|---|---|
  | `CONCERT` | `#FF6B6B` (레드) | 단독 콘서트 |
  | `BUSKING` | `#FFD93D` (옐로우) | 버스킹 |
  | `FESTIVAL` | `#6BCB77` (그린) | 페스티벌 |
  | `RELEASE` | `#4D96FF` (블루) | 음원/앨범 발매 |
  | `OTHER` | `#A8A8A8` (그레이) | 기타 |
- 한 날짜에 여러 타입의 일정이 있으면 여러 도트 표시 (최대 3개, 초과 시 `+N`)

#### 1.3 스와이프 제스처
- 좌/우 스와이프로 월 이동 지원

### 2. 날짜 선택 시 일정 리스트

#### 2.1 동작
- 날짜를 탭하면 캘린더 하단에 해당 날짜의 일정 리스트가 표시
- 일정이 없는 날짜를 탭하면 "일정이 없습니다" 빈 상태 표시

#### 2.2 일정 카드 구성
각 일정 카드에 표시할 정보:
- **일정 타입 색상 인디케이터** (좌측 바 또는 태그)
- **일정 제목** (`Schedule.title`)
- **일정 타입 라벨** (콘서트, 버스킹 등)
- **시간** (`Schedule.startDate` ~ `Schedule.endDate`)
- **장소** (`Schedule.location`)
- **참여 아티스트 수** 또는 **대표 아티스트 이미지** (라인업 기반, `lineups.artist` 접근)

#### 2.3 정렬
- 시작 시간 오름차순

### 3. 일정 바텀시트

#### 3.1 동작
- 일정 카드를 탭하면 바텀시트(모달)가 올라옴
- 바텀시트에는 일정 요약 + 라인업 목록 표시

#### 3.2 바텀시트 구성
- **일정 이미지** (`Schedule.imageUrl`) — 있을 경우
- **일정 제목**
- **일정 타입 뱃지** (색상 포함)
- **날짜/시간**
- **장소 + 주소** (`Schedule.location`, `Schedule.address`)
- **라인업 목록** (ScheduleLineup 기반, `lineups: { include: { artist: true } }` 쿼리 필요)
  - 각 항목: 아티스트 이미지(`artist.imageUrl`) + 아티스트 이름(`artist.name`) + 스테이지 이름(`stageName`) + 공연 시간(`startTime`~`endTime`)
- **"상세 보기" 버튼** → 일정 상세 페이지로 이동

#### 3.3 일정 상세 페이지 (NEW)

현재 일정 상세 페이지가 없으므로 새로 생성.

**라우트**: `/schedules/[id]`

**표시 정보:**
- 일정 이미지 (상단 히어로)
- 일정 제목 + 타입 뱃지
- 날짜/시간 (startDate ~ endDate)
- 장소 + 주소 (지도 링크 가능)
- 설명 (`Schedule.description`)
- 전체 라인업 목록 (아티스트 이미지, 이름, 스테이지, 공연 시간, 순서)
  - 아티스트 이름 탭 → 아티스트 상세 페이지 (`/artists/[id]`)로 이동
- 참석 표시 버튼 (기존 Attendance API 연동, 추후)
- 북마크 버튼 (기존 Bookmark API 연동, 추후)

> **참고**: 아티스트 상세 페이지(`artists/[id].tsx`)도 현재 플레이스홀더(ID만 표시) 상태. 캘린더에서의 아티스트 링크는 라우팅만 연결하고, 아티스트 상세 페이지 구현은 별도 작업으로 진행.

### 4. 탭 네비게이션

#### 4.1 배치
- **기존**: 홈(1) → 아티스트(2) → 일정(3)
- **변경**: 홈(1) → 아티스트(2) → **캘린더(3)** (기존 일정 탭을 캘린더로 교체)
- 기존 `schedules.tsx`는 빈 화면이므로 캘린더로 교체하여 탭 3개 유지

#### 4.2 구현
- `app/(tabs)/schedules.tsx`를 캘린더 화면으로 변경 (파일명 유지하여 라우팅 호환)
- 탭 제목: "캘린더" (또는 "일정")
- 탭 아이콘: `calendar` (Ionicons, 기존과 동일)

## Server API

### 캘린더 전용 엔드포인트

#### `GET /schedules/calendar`

월별 일정을 캘린더 렌더링에 최적화된 형태로 반환.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | Yes | 조회 연도 (예: 2026) |
| `month` | number | Yes | 조회 월 (1-12) |
| `artistId` | string | No | 특정 아티스트 일정만 필터링 |

**서버 쿼리 로직:**
```typescript
// Schedule → ScheduleLineup → Artist 관계를 통해 조회
this.prisma.schedule.findMany({
  where: {
    OR: [
      // startDate가 해당 월 범위 내
      { startDate: { gte: monthStart, lt: monthEnd } },
      // endDate가 해당 월 범위 내 (여러 날 일정)
      { endDate: { gte: monthStart, lt: monthEnd } },
      // 해당 월을 걸치는 일정 (startDate < monthStart && endDate > monthEnd)
      { startDate: { lt: monthStart }, endDate: { gt: monthEnd } },
    ],
    // artistId 필터 (선택적)
    ...(artistId && {
      lineups: { some: { artistId } },
    }),
  },
  include: {
    lineups: {
      include: { artist: true },
      orderBy: { performanceOrder: 'asc' },
    },
  },
  orderBy: { startDate: 'asc' },
});
```

**Response:**

> Prisma `include` 결과를 그대로 반환 (nested artist 객체). 별도 DTO 변환 없이 Prisma 출력 형태 유지.

```json
{
  "year": 2026,
  "month": 3,
  "schedules": [
    {
      "id": "schedule-uuid",
      "title": "봄맞이 버스킹",
      "type": "BUSKING",
      "startDate": "2026-03-15T14:00:00Z",
      "endDate": "2026-03-15T16:00:00Z",
      "location": "홍대 걷고싶은거리",
      "address": "서울특별시 마포구 ...",
      "imageUrl": "https://...",
      "lineups": [
        {
          "id": "lineup-uuid",
          "scheduleId": "schedule-uuid",
          "artistId": "artist-uuid",
          "stageName": "메인 스테이지",
          "startTime": "2026-03-15T14:30:00Z",
          "endTime": "2026-03-15T15:00:00Z",
          "performanceOrder": 1,
          "artist": {
            "id": "artist-uuid",
            "name": "밴드A",
            "imageUrl": "https://...",
            "genre": "인디록"
          }
        }
      ]
    }
  ],
  "dates": {
    "2026-03-15": ["BUSKING"],
    "2026-03-20": ["CONCERT", "FESTIVAL"],
    "2026-03-22": ["CONCERT"]
  }
}
```

**`dates` 필드**: 클라이언트가 도트를 빠르게 렌더링할 수 있도록 날짜별 일정 타입 요약을 제공. 여러 날에 걸치는 일정(페스티벌 등)은 `startDate`~`endDate` 범위의 모든 날짜에 해당 타입을 포함.

### NestJS 모듈 구조

기존 `ScheduleModule`에 캘린더 관련 엔드포인트 추가:

```
apps/server/src/schedule/
├── schedule.module.ts
├── schedule.controller.ts     # 캘린더 엔드포인트 추가
├── schedule.service.ts        # 캘린더 쿼리 로직 추가 + 기존 쿼리 버그 수정
└── dto/
    ├── create-schedule.dto.ts
    ├── update-schedule.dto.ts
    └── calendar-query.dto.ts  # NEW
```

## Mobile Implementation

### 화면 구조

```
app/
├── (tabs)/
│   ├── _layout.tsx          # 탭 제목을 "캘린더"로 변경
│   ├── index.tsx            # 홈
│   ├── artists.tsx          # 아티스트 목록
│   └── schedules.tsx        # 캘린더 화면으로 변경 (기존 빈 화면 교체)
└── schedules/
    └── [id].tsx             # NEW: 일정 상세 페이지
```

### 주요 컴포넌트

> 현재 모바일 앱에 `components/` 디렉토리가 없으므로 새로 생성.

```
components/
├── calendar/
│   ├── CalendarHeader.tsx        # 연/월 표시 + 네비게이션
│   ├── CalendarGrid.tsx          # 월간 날짜 그리드
│   ├── CalendarDayCell.tsx       # 개별 날짜 셀 (도트 포함)
│   ├── ScheduleList.tsx          # 선택된 날짜의 일정 리스트
│   ├── ScheduleCard.tsx          # 일정 카드
│   └── ScheduleBottomSheet.tsx   # 일정 상세 바텀시트
```

### 디자인 토큰 (Tamagui)

기존 Tamagui 디자인 시스템에 캘린더 관련 토큰 추가:

```typescript
// 일정 타입별 색상 토큰
const scheduleTypeColors = {
  concert: '#FF6B6B',
  busking: '#FFD93D',
  festival: '#6BCB77',
  release: '#4D96FF',
  other: '#A8A8A8',
}
```

### 라이브러리

- 캘린더 UI: 자체 구현 또는 `react-native-calendars` 활용
- 바텀시트: `@gorhom/bottom-sheet` (Expo 호환)
- API 호출: 기존 프로젝트의 fetch 패턴 활용

## Data Flow

```
1. 캘린더 탭 진입
   → GET /schedules/calendar?year=2026&month=3
   → 응답의 `dates`로 캘린더 그리드 도트 렌더링
   → 오늘 날짜 자동 선택

2. 날짜 선택 (예: 3월 15일)
   → 이미 로드된 `schedules`에서 해당 날짜 필터링
   → 하단 일정 리스트 렌더링

3. 일정 카드 탭
   → 바텀시트 표시 (일정 요약 + 라인업)

4. "상세 보기" 탭
   → router.push('/schedules/[id]')

5. 월 이동 (스와이프/화살표)
   → 새 월의 GET /schedules/calendar 호출
   → 이전 월 데이터 캐시 유지 (뒤로 갈 때 재요청 방지)
```

## Edge Cases

- **일정이 여러 날에 걸치는 경우** (예: 3일 페스티벌): `startDate` ~ `endDate` 사이 모든 날짜에 도트 표시
- **일정이 없는 월**: 빈 캘린더 + 안내 메시지
- **데이터 로딩 중**: 캘린더 스켈레톤 UI
- **네트워크 오류**: 에러 메시지 + 재시도 버튼
- **과거 월**: 동일하게 표시 (지난 일정도 확인 가능)
- **월 경계 일정**: 3월 30일 시작 ~ 4월 2일 종료 → 3월, 4월 둘 다에 표시

## Out of Scope

- 일정 생성/수정 (어드민에서만 가능)
- 구글/애플 캘린더 연동 (외부 캘린더 내보내기)
- 푸시 알림 (일정 리마인더)
- 주간/일간 뷰 전환
- 검색 기능 (캘린더 내 일정 검색)
- 참석/북마크 UI 연동 (기존 Attendance/Bookmark API는 존재하나, 이 PRD 범위에서는 상세 페이지에 버튼만 배치하고 연동은 추후)

## Dependencies

- 기존 Schedule, ScheduleLineup, Artist Prisma 모델 활용 (스키마 변경 불필요)
- Tamagui 디자인 시스템 (이미 적용됨)
- 모바일 API 클라이언트 설정 필요
- **선행 작업**: `schedule.service.ts` 기존 쿼리 버그 수정, `CreateScheduleDto` + 어드민 일정 등록 수정, `@ipchun/shared` Schedule 타입 수정

## Success Criteria

- [ ] 월간 캘린더에서 일정이 있는 날짜에 타입별 색상 도트가 표시된다
- [ ] 여러 날에 걸치는 일정이 해당 범위의 모든 날짜에 도트로 표시된다
- [ ] 날짜 선택 시 해당일 일정 리스트가 하단에 표시된다
- [ ] 일정 카드 탭 시 바텀시트에 요약 정보 + 라인업 목록이 표시된다
- [ ] 바텀시트에서 상세 페이지로 이동할 수 있다
- [ ] 일정 상세 페이지에서 라인업의 아티스트를 탭하면 아티스트 상세로 이동한다
- [ ] 월 이동 (스와이프/화살표)이 정상 동작한다
- [ ] 캘린더 전용 API가 월별 데이터를 올바르게 반환한다 (lineups.artist 포함)
- [ ] 기존 일정 탭이 캘린더로 교체되어 탭 3개가 유지된다
