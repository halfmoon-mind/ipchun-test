# Personal Timetable Bookmark Design

## Overview

사용자가 페스티벌/콘서트/버스킹 등의 스케줄에 대해 두 단계로 개인화하는 기능:

1. **스케줄 참가 표시** — 특정 날짜에 "간다/안간다" 설정 (Schedule 레벨)
2. **라인업 북마크** — 개별 공연/아티스트를 체크/해제 (ScheduleLineup 레벨)

Offline-first로 동작하며, 로그인 시 서버에 동기화된다. 체크된 타임테이블은 이미지로 내보내기/공유할 수 있다.

## Requirements

- Schedule 단위 참가 표시 (날짜별 간다/안간다)
- ScheduleLineup 단위 체크/해제 토글 (on/off)
- 타임테이블 미공개 상태(아티스트만 발표)에서도 북마크 가능
- Offline-first: 로컬 저장 우선, 로그인 시 서버 동기화
- 이미지 내보내기: 클라이언트에서 생성, OS 공유 시트로 공유
- 충돌 해결: Last-write-wins (LWW)

## Prerequisites

- 인증(Auth) 모듈이 아직 구현되어 있지 않음. 서버 동기화 API는 인증이 필요하므로, Auth Guard / JWT 미들웨어 구현이 선행되거나 병행되어야 함
- 인증 미구현 상태에서도 로컬 전용 모드(오프라인)로 북마크 기능 자체는 동작 가능

## Data Model

### New: UserScheduleAttendance (스케줄 참가 표시)

```prisma
model UserScheduleAttendance {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scheduleId String   @map("schedule_id")
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  date       DateTime @db.Date // 참가하는 특정 날짜 (date only)
  checkedAt  DateTime @map("checked_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([userId, scheduleId, date])
  @@map("user_schedule_attendances")
}
```

- 페스티벌 (3일): 날짜별 레코드 → "1일차 간다, 3일차 간다"
- 콘서트/버스킹 (1일): 레코드 1개 → "간다/안간다"
- LWW 동기화는 UserBookmark과 동일한 방식

### New: UserBookmark (라인업 북마크)

```prisma
model UserBookmark {
  id               String         @id @default(uuid())
  userId           String         @map("user_id")
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  scheduleLineupId String         @map("schedule_lineup_id")
  scheduleLineup   ScheduleLineup @relation(fields: [scheduleLineupId], references: [id], onDelete: Cascade)
  checkedAt        DateTime       @map("checked_at")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@unique([userId, scheduleLineupId])
  @@map("user_bookmarks")
}
```

### Existing Schema Changes

기존 모델에 변경이 필요함:

```prisma
// ScheduleLineup 모델 변경: startTime, endTime을 optional로
model ScheduleLineup {
  // ... 기존 필드
  startTime        DateTime? @map("start_time")   // DateTime → DateTime? 변경
  endTime          DateTime? @map("end_time")      // DateTime → DateTime? 변경
  bookmarks        UserBookmark[]                  // 역참조 추가
}

// Schedule 모델에 역참조 추가
model Schedule {
  // ... 기존 필드
  attendances UserScheduleAttendance[]
}

// User 모델에 역참조 추가
model User {
  // ... 기존 필드
  bookmarks   UserBookmark[]
  attendances UserScheduleAttendance[]
}
```

**`startTime`/`endTime` optional 변경 이유**: 페스티벌이 참가 아티스트만 발표하고 타임테이블은 아직 미공개인 경우, ScheduleLineup 레코드를 시간 없이 생성할 수 있어야 함. 타임테이블 공개 시 시간만 업데이트하면 되므로, 북마크 로직에는 영향 없음.

### Relationships

- `User` 1:N `UserScheduleAttendance` — 한 유저가 여러 스케줄/날짜에 참가 표시
- `Schedule` 1:N `UserScheduleAttendance` — 한 스케줄이 여러 유저의 참가 표시를 가짐
- `User` 1:N `UserBookmark` — 한 유저가 여러 라인업을 북마크
- `ScheduleLineup` 1:N `UserBookmark` — 한 라인업이 여러 유저에게 북마크됨
- 모든 unique 제약과 `onDelete: Cascade` 적용

### LWW Timestamp

- `checkedAt`: 사용자가 체크한 시점 (클라이언트 기준)
- 동기화 시 서버의 `checkedAt`과 클라이언트의 `checkedAt`을 비교하여 최신 값이 승리
- 삭제(uncheck)는 hard delete. 서버에 레코드가 없는 경우 클라이언트의 removal은 무시됨 (이미 삭제된 상태)

## Server API

### Attendance Endpoints (스케줄 참가)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/attendances?scheduleId=xxx` | Required | 특정 스케줄의 내 참가 날짜 목록 |
| `PUT` | `/attendances/sync` | Required | 배치 동기화 (offline → server) |
| `PUT` | `/attendances/:scheduleId/:date` | Required | 개별 토글 (간다/안간다) |

> **라우트 순서**: `/attendances/sync`를 `/attendances/:scheduleId/:date`보다 먼저 정의.

### Bookmark Endpoints (라인업 북마크)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/bookmarks?scheduleId=xxx` | Required | 특정 스케줄의 내 북마크 목록 |
| `PUT` | `/bookmarks/sync` | Required | 배치 동기화 (offline → server) |
| `PUT` | `/bookmarks/:lineupId` | Required | 개별 토글 (없으면 생성, 있으면 삭제) |

> **라우트 순서**: `/bookmarks/sync`를 `/bookmarks/:lineupId`보다 먼저 정의.

### Response DTOs

```typescript
interface AttendanceDto {
  scheduleId: string;
  date: string;      // YYYY-MM-DD
  checkedAt: string;  // ISO 8601
}

interface BookmarkDto {
  scheduleLineupId: string;
  checkedAt: string; // ISO 8601
}
```

### GET /attendances?scheduleId=xxx

Response:
```json
{
  "attendances": [
    { "scheduleId": "xxx", "date": "2026-03-15", "checkedAt": "2026-03-11T10:00:00Z" },
    { "scheduleId": "xxx", "date": "2026-03-17", "checkedAt": "2026-03-11T10:01:00Z" }
  ]
}
```

### PUT /attendances/:scheduleId/:date

개별 토글. 참가 표시가 없으면 생성, 있으면 삭제.

Request:
```json
{
  "checkedAt": "2026-03-11T10:00:00Z"
}
```

Response:
```json
{ "attending": true, "attendance": { "scheduleId": "...", "date": "2026-03-15", "checkedAt": "..." } }
```
또는:
```json
{ "attending": false }
```

### PUT /attendances/sync

Request:
```json
{
  "scheduleId": "schedule-uuid",
  "attendances": [
    { "date": "2026-03-15", "checkedAt": "2026-03-11T10:00:00Z" },
    { "date": "2026-03-17", "checkedAt": "2026-03-11T10:01:00Z" }
  ],
  "removals": [
    { "date": "2026-03-16", "removedAt": "2026-03-11T10:02:00Z" }
  ]
}
```

Server logic: BookmarkSync와 동일 (LWW 기반 upsert/delete, 최종 상태 반환).

Response:
```json
{
  "attendances": [
    { "scheduleId": "xxx", "date": "2026-03-15", "checkedAt": "..." },
    { "scheduleId": "xxx", "date": "2026-03-17", "checkedAt": "..." }
  ]
}
```

### GET /bookmarks?scheduleId=xxx

Response:
```json
{
  "bookmarks": [
    { "scheduleLineupId": "lineup-id", "checkedAt": "2026-03-11T10:00:00Z" }
  ]
}
```

### PUT /bookmarks/:lineupId

개별 토글. 북마크가 없으면 생성, 있으면 삭제.

Request:
```json
{
  "checkedAt": "2026-03-11T10:00:00Z"
}
```

Response:
```json
{
  "bookmarked": true,
  "bookmark": { "scheduleLineupId": "...", "checkedAt": "..." }
}
```
또는:
```json
{
  "bookmarked": false
}
```

### PUT /bookmarks/sync

배치 동기화. 클라이언트의 로컬 상태를 서버와 병합하고 최종 상태를 반환.

Request:
```json
{
  "scheduleId": "schedule-uuid",
  "bookmarks": [
    { "lineupId": "a1", "checkedAt": "2026-03-11T10:00:00Z" },
    { "lineupId": "a2", "checkedAt": "2026-03-11T10:05:00Z" }
  ],
  "removals": [
    { "lineupId": "a3", "removedAt": "2026-03-11T10:02:00Z" }
  ]
}
```

Server logic:
1. `bookmarks` 항목: 서버에 해당 레코드가 없거나, 클라이언트 `checkedAt` > 서버 `checkedAt`이면 upsert
2. `removals` 항목: 서버에 해당 레코드가 있고, `removedAt` > 서버 `checkedAt`이면 hard delete
3. 해당 scheduleId의 최종 북마크 전체 목록 반환

Response:
```json
{
  "bookmarks": [
    { "scheduleLineupId": "a1", "checkedAt": "2026-03-11T10:00:00Z" },
    { "scheduleLineupId": "a2", "checkedAt": "2026-03-11T10:05:00Z" }
  ]
}
```

### NestJS Module Structure

```
apps/server/src/attendance/
├── attendance.module.ts
├── attendance.controller.ts
├── attendance.service.ts
└── dto/
    ├── sync-attendances.dto.ts
    └── toggle-attendance.dto.ts

apps/server/src/bookmark/
├── bookmark.module.ts
├── bookmark.controller.ts
├── bookmark.service.ts
└── dto/
    ├── sync-bookmarks.dto.ts
    └── toggle-bookmark.dto.ts
```

## Client (Mobile) Design

### Local Storage

MMKV (`react-native-mmkv`)를 기본 사용. Expo Go 환경에서는 AsyncStorage를 fallback으로.

Storage key 구조:
```typescript
// === Attendance (스케줄 참가) ===
// key: "attendances:{scheduleId}"
{ "2026-03-15": { "checkedAt": "..." }, "2026-03-17": { "checkedAt": "..." } }

// key: "attendances:{scheduleId}:removals"
{ "2026-03-16": { "removedAt": "..." } }

// === Bookmark (라인업 북마크) ===
// key: "bookmarks:{scheduleId}"
{ "lineup-id-a1": { "checkedAt": "..." }, "lineup-id-a2": { "checkedAt": "..." } }

// key: "bookmarks:{scheduleId}:removals"
{ "lineup-id-a3": { "removedAt": "..." } }

// === Dirty tracking (공통) ===
// key: "dirty-schedules"
// value: JSON — 오프라인 변경이 있는 scheduleId 목록
["schedule-id-1", "schedule-id-2"]
```

### Sync Strategy

```
앱 시작 또는 로그인 시:
  1. dirty-schedules 목록 읽기
  2. 각 dirty scheduleId에 대해 PUT /bookmarks/sync 호출
  3. 서버 응답(최종 상태)으로 로컬 교체
  4. removals 초기화, dirty-schedules에서 제거

체크 토글 시 (온라인):
  1. 로컬 즉시 반영 (optimistic update)
  2. PUT /bookmarks/:lineupId 호출
  3. 실패 시 → dirty-schedules에 해당 scheduleId 추가, 다음 sync에서 재시도

체크 토글 시 (오프라인):
  1. 로컬만 반영
  2. dirty-schedules에 해당 scheduleId 추가
  3. 다음 동기화 시 일괄 처리
```

### Image Export

- `react-native-view-shot`: 타임테이블 뷰를 PNG 이미지로 캡처
- 체크된 항목만 하이라이트된 상태로 렌더링
- `expo-sharing`: OS 공유 시트 호출 (카카오톡, 인스타 등)
- 서버 API 불필요 (순수 클라이언트 로직)
- 상세 UI/UX는 모바일 디자인 구현 시 결정

## Dependencies

### Server
- 기존: NestJS, Prisma, PostgreSQL
- 추가 없음

### Mobile
- 추가: `react-native-mmkv` (로컬 저장소)
- 추가: `react-native-view-shot` (이미지 캡처)
- 추가: `expo-sharing` (공유 시트)

## Out of Scope

- 링크 공유 (URL로 타임테이블 공유)
- 메모/우선순위 (체크 외 추가 정보)
- 친구 간 공유/협업
- 푸시 알림 (공연 시작 전 리마인더)
- 인증 모듈 구현 (별도 스펙으로 다룸)
