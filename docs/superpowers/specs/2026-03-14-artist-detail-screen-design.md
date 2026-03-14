# 아티스트 상세 화면 설계

## 개요

모바일 앱에서 아티스트의 소개 정보와 관련 일정을 보여주는 상세 화면을 구현한다. 1차 범위에서는 아티스트 소개와 일정 목록에 집중하며, 추천 곡과 팬들의 한마디는 이후 단계로 미룬다.

## 진입 경로

- 스케줄 상세 화면 → 라인업의 아티스트 이름 탭
- 아티스트 목록 탭
- 홈 화면 (추천/인기 아티스트)
- (미래) 인디 밴드 공연 캘린더 뷰

모두 `router.push(`/artists/${artistId}`)` 형태로 동일한 라우트를 사용한다.

## 화면 구조

### 컴팩트 헤더

좌측 72px 둥근 사각 썸네일 + 우측 정보의 수평 레이아웃.

| 요소 | 데이터 소스 | 비고 |
|------|------------|------|
| 프로필 이미지 | `artist.imageUrl` | null이면 장르 기반 기본 아이콘 |
| 이름 | `artist.name` | - |
| 장르 | `artist.genre` | null이면 숨김 |
| 소셜 링크 | `artist.socialLinks` | 칩 형태, Linking.openURL로 외부 연결 |

### 소개글

- `artist.description` 표시
- 3줄 초과 시 "더 보기" 토글로 접힘 처리
- null이면 섹션 자체 숨김

### 일정 목록 — 섹션 분리 방식

"다가오는 일정"과 "지난 일정"을 별도 섹션으로 나누어 표시한다.

**다가오는 일정 섹션:**
- `startDate >= 오늘`, 오름차순 (가까운 날짜 먼저)
- 골드 색상(`#F5A623`)으로 날짜 강조
- 인디 밴드 특성상 소수이므로 전부 표시 (페이지네이션 불필요)
- 해당 일정이 없으면 섹션 숨김

**지난 일정 섹션:**
- `startDate < 오늘`, 내림차순 (최근 먼저)
- opacity 0.6으로 시각적 구분
- 초기 10개 표시, 커서 기반 페이지네이션으로 "더 보기"
- 해당 일정이 없으면 섹션 숨김

**일정 카드 구성:**
- 날짜 (포맷: `3월 22일 (토)`)
- 제목 (`schedule.title`)
- 장소 (`schedule.location`)
- 타입 배지 (`schedule.type`: CONCERT, FESTIVAL, BUSKING 등)

**일정 카드 탭 → 스케줄 상세 화면으로 이동** (`router.push(`/schedules/${scheduleId}`)`)

**빈 상태:**
- 일정이 하나도 없을 때: "아직 등록된 일정이 없습니다" 메시지 표시

## 서버 API

### 아티스트 조회: `GET /artists/:id`

기존 API 그대로 사용. 변경 없음.

### 아티스트 일정 조회: `GET /schedules?artistId=xxx`

Schedule과 Artist는 `ScheduleLineup` 조인 테이블을 통해 연결된다. 기존 `findByArtist` 메서드가 이미 `where: { lineups: { some: { artistId } } }`로 올바르게 조회하고 있다.

**기존 메서드에 추가할 파라미터:**
- `period`: `upcoming` | `past` (선택)
  - `upcoming`: `schedule.startDate >= 오늘`, 오름차순
  - `past`: `schedule.startDate < 오늘`, 내림차순
  - 미지정 시: 전체, 오름차순
- `cursor`: 마지막 스케줄 ID (선택, past 페이지네이션용)
- `limit`: 기본 10 (선택)

**컨트롤러 변경:** `findAll`의 쿼리 파라미터에 `period`, `cursor`, `limit` 추가. DTO로 유효성 검증:

```typescript
// dto/find-schedules-query.dto.ts
export class FindSchedulesQueryDto {
  @IsOptional() @IsUUID()
  artistId?: string;

  @IsOptional() @IsIn(['upcoming', 'past'])
  period?: 'upcoming' | 'past';

  @IsOptional() @IsUUID()
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number;
}
```

**응답 형태:**

`period` 파라미터가 있을 때만 페이지네이션 응답을 반환한다. `period` 없이 호출하면 기존과 동일하게 `Schedule[]` 배열을 반환하여 하위 호환성을 유지한다.

```typescript
// period 있을 때
{
  data: Schedule[];
  nextCursor: string | null;
}

// period 없을 때 (기존 호환)
Schedule[]
```

### 공유 타입 추가

`packages/shared/src/index.ts`에 페이지네이션 응답 인터페이스 추가:

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
```

## 모바일 클라이언트

### 파일 구조

```
apps/mobile/app/artists/[id].tsx  — 기존 파일 수정 (화면 컴포넌트)
```

### 데이터 페칭

```
화면 진입 (artistId from useLocalSearchParams)
  ├─ 병렬 호출 ─┬─ GET /artists/:id → artist 상태
  │             ├─ GET /schedules?artistId=xxx&period=upcoming → upcoming 상태
  │             └─ GET /schedules?artistId=xxx&period=past&limit=10 → past 상태
  ├─ 로딩 중 → 스켈레톤 UI
  ├─ 에러 → 에러 메시지 + 재시도 버튼
  └─ 성공 → 화면 렌더링
```

- `fetch`로 직접 호출 (현재 프로젝트에 HTTP 클라이언트 라이브러리 없음)
- `useEffect` + `useState`로 상태 관리
- "더 보기" 탭 시 past 커서로 추가 로드, 기존 목록에 append

### UI 컴포넌트

Tamagui 기반으로 구현. 기존 디자인 시스템의 토큰 활용:
- 배경: `$background` (#000000)
- 카드 배경: `$backgroundElevated` (#1C1C1E)
- 텍스트: `$color`, `$colorSecondary`, `$colorTertiary`
- 강조색: `$accentColor` (#F5A623)
- 폰트: Pretendard (body/title 사이즈)

### 네비게이션 헤더

expo-router Stack 헤더 사용. 뒤로가기 자동 처리.

## 스코프 아웃 (1차 범위 밖)

- 추천 곡 섹션
- 팬들의 한마디 섹션
- 아티스트 팔로우/좋아요
- 스케줄 상세 화면 구현 (라우트만 연결, 화면 자체는 별도 작업)
- 오프라인 캐싱
