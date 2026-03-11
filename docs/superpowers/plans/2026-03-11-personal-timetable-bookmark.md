# Personal Timetable Bookmark Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 스케줄 참가 여부(날짜별)와 라인업 북마크를 서버에서 관리할 수 있는 API를 구현한다.

**Architecture:** Prisma 스키마에 `UserScheduleAttendance`와 `UserBookmark` 모델을 추가하고, 각각 NestJS 모듈(attendance, bookmark)로 CRUD + 배치 동기화 API를 제공한다. 인증은 아직 미구현이므로, userId를 헤더(`x-user-id`)로 받는 임시 방식으로 구현한다.

**Tech Stack:** NestJS 11, Prisma 7.4, PostgreSQL, Jest, class-validator

**Spec:** `docs/superpowers/specs/2026-03-11-personal-timetable-bookmark-design.md`

---

## File Structure

### New Files

```
apps/server/src/attendance/
├── attendance.module.ts          — NestJS 모듈 등록
├── attendance.controller.ts      — GET, PUT /attendances 엔드포인트
├── attendance.service.ts         — Prisma 기반 CRUD + sync 로직
├── attendance.controller.spec.ts — 컨트롤러 단위 테스트
├── attendance.service.spec.ts    — 서비스 단위 테스트
└── dto/
    ├── sync-attendances.dto.ts   — 배치 동기화 요청 DTO
    └── toggle-attendance.dto.ts  — 개별 토글 요청 DTO

apps/server/src/bookmark/
├── bookmark.module.ts            — NestJS 모듈 등록
├── bookmark.controller.ts        — GET, PUT /bookmarks 엔드포인트
├── bookmark.service.ts           — Prisma 기반 CRUD + sync 로직
├── bookmark.controller.spec.ts   — 컨트롤러 단위 테스트
├── bookmark.service.spec.ts      — 서비스 단위 테스트
└── dto/
    ├── sync-bookmarks.dto.ts     — 배치 동기화 요청 DTO
    └── toggle-bookmark.dto.ts    — 개별 토글 요청 DTO
```

### Modified Files

```
apps/server/prisma/schema.prisma          — 새 모델 추가, ScheduleLineup 시간 optional 변경
apps/server/src/app.module.ts             — AttendanceModule, BookmarkModule 임포트
packages/shared/src/index.ts              — Attendance, Bookmark 인터페이스 추가
```

---

## Chunk 1: Prisma Schema & Migration

### Task 1: Prisma 스키마 업데이트

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: ScheduleLineup의 startTime/endTime을 optional로 변경**

`apps/server/prisma/schema.prisma`에서 ScheduleLineup 모델 수정:

```prisma
model ScheduleLineup {
  id               String         @id @default(uuid())
  scheduleId       String         @map("schedule_id")
  schedule         Schedule       @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  artistId         String         @map("artist_id")
  artist           Artist         @relation(fields: [artistId], references: [id], onDelete: Cascade)
  stageName        String?        @map("stage_name")
  startTime        DateTime?      @map("start_time")
  endTime          DateTime?      @map("end_time")
  performanceOrder Int?           @map("performance_order")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")
  bookmarks        UserBookmark[]

  @@unique([scheduleId, artistId])
  @@map("schedule_lineups")
}
```

변경 포인트:
- `startTime DateTime` → `startTime DateTime?`
- `endTime DateTime` → `endTime DateTime?`
- `bookmarks UserBookmark[]` 역참조 추가

- [ ] **Step 2: UserScheduleAttendance 모델 추가**

schema.prisma 파일 끝에 추가:

```prisma
model UserScheduleAttendance {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scheduleId String   @map("schedule_id")
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  date       DateTime @db.Date
  checkedAt  DateTime @map("checked_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([userId, scheduleId, date])
  @@map("user_schedule_attendances")
}
```

- [ ] **Step 3: UserBookmark 모델 추가**

schema.prisma 파일 끝에 추가:

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

- [ ] **Step 4: 기존 모델에 역참조 필드 추가**

User 모델에 추가:
```prisma
  bookmarks   UserBookmark[]
  attendances UserScheduleAttendance[]
```

Schedule 모델에 추가:
```prisma
  attendances UserScheduleAttendance[]
```

- [ ] **Step 5: Prisma client 재생성**

Run: `cd apps/server && npx prisma generate`
Expected: Prisma Client 생성 성공

- [ ] **Step 6: 마이그레이션 생성**

Run: `cd apps/server && npx prisma migrate dev --name add-attendance-and-bookmark`
Expected: 마이그레이션 파일 생성 및 적용 성공

- [ ] **Step 7: 빌드 확인**

Run: `cd apps/server && npx nest build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 8: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add UserScheduleAttendance and UserBookmark models, make lineup times optional"
```

---

## Chunk 2: Attendance Module

### Task 2: Attendance DTOs

**Files:**
- Create: `apps/server/src/attendance/dto/toggle-attendance.dto.ts`
- Create: `apps/server/src/attendance/dto/sync-attendances.dto.ts`

- [ ] **Step 1: ToggleAttendanceDto 작성**

```typescript
// apps/server/src/attendance/dto/toggle-attendance.dto.ts
import { IsDateString } from 'class-validator';

export class ToggleAttendanceDto {
  @IsDateString()
  checkedAt!: string;
}
```

- [ ] **Step 2: SyncAttendancesDto 작성**

```typescript
// apps/server/src/attendance/dto/sync-attendances.dto.ts
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class AttendanceItemDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  checkedAt!: string;
}

export class AttendanceRemovalDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  removedAt!: string;
}

export class SyncAttendancesDto {
  @IsUUID()
  scheduleId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  attendances!: AttendanceItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRemovalDto)
  @IsOptional()
  removals?: AttendanceRemovalDto[];
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/attendance/dto/
git commit -m "feat: add attendance DTOs for toggle and sync"
```

### Task 3: Attendance Service

**Files:**
- Create: `apps/server/src/attendance/attendance.service.ts`
- Create: `apps/server/src/attendance/attendance.service.spec.ts`

- [ ] **Step 1: 서비스 테스트 작성 — findBySchedule**

```typescript
// apps/server/src/attendance/attendance.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userScheduleAttendance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('findBySchedule', () => {
    it('should return attendances for a user and schedule', async () => {
      const mockAttendances = [
        { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date() },
      ];
      mockPrisma.userScheduleAttendance.findMany.mockResolvedValue(mockAttendances);

      const result = await service.findBySchedule('u1', 's1');

      expect(mockPrisma.userScheduleAttendance.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', scheduleId: 's1' },
      });
      expect(result).toEqual(mockAttendances);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/server && npx jest attendance.service.spec --no-coverage`
Expected: FAIL — AttendanceService 모듈 없음

- [ ] **Step 3: AttendanceService 구현 — findBySchedule**

```typescript
// apps/server/src/attendance/attendance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  findBySchedule(userId: string, scheduleId: string) {
    return this.prisma.userScheduleAttendance.findMany({
      where: { userId, scheduleId },
    });
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/server && npx jest attendance.service.spec --no-coverage`
Expected: PASS

- [ ] **Step 5: toggle 테스트 추가**

`attendance.service.spec.ts`에 추가:

```typescript
  describe('toggle', () => {
    it('should create attendance when not exists', async () => {
      mockPrisma.userScheduleAttendance.findUnique.mockResolvedValue(null);
      mockPrisma.userScheduleAttendance.create.mockResolvedValue({
        id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 's1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(true);
    });

    it('should delete attendance when exists', async () => {
      mockPrisma.userScheduleAttendance.findUnique.mockResolvedValue({
        id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date(),
      });
      mockPrisma.userScheduleAttendance.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 's1', '2026-03-15', new Date().toISOString());

      expect(result.attending).toBe(false);
    });
  });
```

- [ ] **Step 6: toggle 구현**

`attendance.service.ts`에 추가:

```typescript
  async toggle(userId: string, scheduleId: string, date: string, checkedAt: string) {
    const dateOnly = new Date(date + 'T00:00:00.000Z');
    const existing = await this.prisma.userScheduleAttendance.findUnique({
      where: { userId_scheduleId_date: { userId, scheduleId, date: dateOnly } },
    });

    if (existing) {
      await this.prisma.userScheduleAttendance.delete({ where: { id: existing.id } });
      return { attending: false };
    }

    const attendance = await this.prisma.userScheduleAttendance.create({
      data: { userId, scheduleId, date: dateOnly, checkedAt: new Date(checkedAt) },
    });

    return {
      attending: true,
      attendance: {
        scheduleId: attendance.scheduleId,
        date: attendance.date.toISOString().split('T')[0],
        checkedAt: attendance.checkedAt.toISOString(),
      },
    };
  }
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd apps/server && npx jest attendance.service.spec --no-coverage`
Expected: PASS

- [ ] **Step 8: sync 테스트 추가**

`attendance.service.spec.ts`에 추가:

```typescript
  describe('sync', () => {
    it('should upsert newer bookmarks and delete older removals, then return final state', async () => {
      // 기존 서버 데이터: date 03-15 checkedAt 10:00
      mockPrisma.userScheduleAttendance.findMany.mockResolvedValue([
        { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
      ]);
      mockPrisma.userScheduleAttendance.upsert.mockResolvedValue({});
      mockPrisma.userScheduleAttendance.delete.mockResolvedValue({});

      // 클라이언트: 03-17을 11:00에 추가, 03-15를 12:00에 제거
      const finalState = [
        { id: '2', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-17'), checkedAt: new Date('2026-03-11T11:00:00Z') },
      ];
      // findMany는 두 번 호출됨: 첫번째는 sync 시작 시, 두번째는 최종 상태 반환 시
      mockPrisma.userScheduleAttendance.findMany
        .mockResolvedValueOnce([
          { id: '1', userId: 'u1', scheduleId: 's1', date: new Date('2026-03-15'), checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce(finalState);

      const result = await service.sync('u1', {
        scheduleId: 's1',
        attendances: [{ date: '2026-03-17', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ date: '2026-03-15', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userScheduleAttendance.upsert).toHaveBeenCalled();
      expect(mockPrisma.userScheduleAttendance.delete).toHaveBeenCalled();
      expect(result.attendances).toEqual(expect.any(Array));
    });
  });
```

- [ ] **Step 9: sync 구현**

`attendance.service.ts`에 추가:

```typescript
  async sync(userId: string, dto: { scheduleId: string; attendances: { date: string; checkedAt: string }[]; removals?: { date: string; removedAt: string }[] }) {
    const { scheduleId, attendances, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 서버의 현재 상태를 맵으로 구성
      const serverRecords = await tx.userScheduleAttendance.findMany({
        where: { userId, scheduleId },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.date.toISOString().split('T')[0], r]),
      );

      // Upsert: 클라이언트 checkedAt > 서버 checkedAt이면 업데이트
      for (const item of attendances) {
        const dateOnly = new Date(item.date + 'T00:00:00.000Z');
        const serverRecord = serverMap.get(item.date);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userScheduleAttendance.upsert({
            where: { userId_scheduleId_date: { userId, scheduleId, date: dateOnly } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, scheduleId, date: dateOnly, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      // Delete: removedAt > 서버 checkedAt이면 삭제
      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.date);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userScheduleAttendance.delete({
            where: { id: serverRecord.id },
          });
        }
      }

      // 최종 상태 반환
      const finalRecords = await tx.userScheduleAttendance.findMany({
        where: { userId, scheduleId },
      });

      return {
        attendances: finalRecords.map((r) => ({
          scheduleId: r.scheduleId,
          date: r.date.toISOString().split('T')[0],
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
```

- [ ] **Step 10: 테스트 통과 확인**

Run: `cd apps/server && npx jest attendance.service.spec --no-coverage`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add apps/server/src/attendance/attendance.service.ts apps/server/src/attendance/attendance.service.spec.ts
git commit -m "feat: implement AttendanceService with findBySchedule, toggle, sync"
```

### Task 4: Attendance Controller

**Files:**
- Create: `apps/server/src/attendance/attendance.controller.ts`
- Create: `apps/server/src/attendance/attendance.controller.spec.ts`

- [ ] **Step 1: 컨트롤러 테스트 작성**

```typescript
// apps/server/src/attendance/attendance.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

const mockService = {
  findBySchedule: jest.fn(),
  toggle: jest.fn(),
  sync: jest.fn(),
};

describe('AttendanceController', () => {
  let controller: AttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: mockService }],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
    jest.clearAllMocks();
  });

  it('GET /attendances should call findBySchedule', async () => {
    mockService.findBySchedule.mockResolvedValue([]);
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.findAll(headers, 's1');
    expect(mockService.findBySchedule).toHaveBeenCalledWith('u1', 's1');
    expect(result).toEqual({ attendances: [] });
  });

  it('PUT /attendances/sync should call sync', async () => {
    mockService.sync.mockResolvedValue({ attendances: [] });
    const headers = { 'x-user-id': 'u1' };
    const dto = { scheduleId: 's1', attendances: [], removals: [] };
    const result = await controller.sync(headers, dto);
    expect(mockService.sync).toHaveBeenCalledWith('u1', dto);
  });

  it('PUT /attendances/:scheduleId/:date should call toggle', async () => {
    mockService.toggle.mockResolvedValue({ attending: true });
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.toggle(headers, 's1', '2026-03-15', { checkedAt: '2026-03-11T10:00:00Z' });
    expect(mockService.toggle).toHaveBeenCalledWith('u1', 's1', '2026-03-15', '2026-03-11T10:00:00Z');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/server && npx jest attendance.controller.spec --no-coverage`
Expected: FAIL — AttendanceController 모듈 없음

- [ ] **Step 3: AttendanceController 구현**

```typescript
// apps/server/src/attendance/attendance.controller.ts
import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { SyncAttendancesDto } from './dto/sync-attendances.dto';
import { ToggleAttendanceDto } from './dto/toggle-attendance.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('scheduleId') scheduleId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!scheduleId) throw new BadRequestException('scheduleId query parameter is required');
    const records = await this.attendanceService.findBySchedule(userId, scheduleId);
    return {
      attendances: records.map((r) => ({
        scheduleId: r.scheduleId,
        date: r.date.toISOString().split('T')[0],
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncAttendancesDto,
  ) {
    const userId = this.getUserId(headers);
    return this.attendanceService.sync(userId, dto);
  }

  @Put(':scheduleId/:date')
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('scheduleId') scheduleId: string,
    @Param('date') date: string,
    @Body() dto: ToggleAttendanceDto,
  ) {
    const userId = this.getUserId(headers);
    if (isNaN(Date.parse(date))) throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    return this.attendanceService.toggle(userId, scheduleId, date, dto.checkedAt);
  }
}
```

> **라우트 순서**: `@Put('sync')`가 `@Put(':scheduleId/:date')`보다 먼저 정의되어 라우트 매칭 충돌을 방지.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/server && npx jest attendance.controller.spec --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/attendance/attendance.controller.ts apps/server/src/attendance/attendance.controller.spec.ts
git commit -m "feat: implement AttendanceController with GET, PUT toggle, PUT sync"
```

### Task 5: Attendance Module 등록

**Files:**
- Create: `apps/server/src/attendance/attendance.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: AttendanceModule 작성**

```typescript
// apps/server/src/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
```

- [ ] **Step 2: AppModule에 AttendanceModule 등록**

`apps/server/src/app.module.ts` 수정:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd apps/server && npx nest build`
Expected: 빌드 성공

- [ ] **Step 4: 전체 테스트 실행**

Run: `cd apps/server && npx jest --no-coverage`
Expected: 모든 attendance 관련 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/attendance/attendance.module.ts apps/server/src/app.module.ts
git commit -m "feat: register AttendanceModule in AppModule"
```

---

## Chunk 3: Bookmark Module

### Task 6: Bookmark DTOs

**Files:**
- Create: `apps/server/src/bookmark/dto/toggle-bookmark.dto.ts`
- Create: `apps/server/src/bookmark/dto/sync-bookmarks.dto.ts`

- [ ] **Step 1: ToggleBookmarkDto 작성**

```typescript
// apps/server/src/bookmark/dto/toggle-bookmark.dto.ts
import { IsDateString } from 'class-validator';

export class ToggleBookmarkDto {
  @IsDateString()
  checkedAt!: string;
}
```

- [ ] **Step 2: SyncBookmarksDto 작성**

```typescript
// apps/server/src/bookmark/dto/sync-bookmarks.dto.ts
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class BookmarkItemDto {
  @IsUUID()
  lineupId!: string;

  @IsDateString()
  checkedAt!: string;
}

export class BookmarkRemovalDto {
  @IsUUID()
  lineupId!: string;

  @IsDateString()
  removedAt!: string;
}

export class SyncBookmarksDto {
  @IsUUID()
  scheduleId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookmarkItemDto)
  bookmarks!: BookmarkItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookmarkRemovalDto)
  @IsOptional()
  removals?: BookmarkRemovalDto[];
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/bookmark/dto/
git commit -m "feat: add bookmark DTOs for toggle and sync"
```

### Task 7: Bookmark Service

**Files:**
- Create: `apps/server/src/bookmark/bookmark.service.ts`
- Create: `apps/server/src/bookmark/bookmark.service.spec.ts`

- [ ] **Step 1: 서비스 테스트 작성**

```typescript
// apps/server/src/bookmark/bookmark.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkService } from './bookmark.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userBookmark: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  scheduleLineup: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

describe('BookmarkService', () => {
  let service: BookmarkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    jest.clearAllMocks();
  });

  describe('findBySchedule', () => {
    it('should return bookmarks for lineups in a schedule', async () => {
      mockPrisma.scheduleLineup.findMany.mockResolvedValue([
        { id: 'l1' }, { id: 'l2' },
      ]);
      mockPrisma.userBookmark.findMany.mockResolvedValue([
        { id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date() },
      ]);

      const result = await service.findBySchedule('u1', 's1');

      expect(mockPrisma.scheduleLineup.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 's1' },
        select: { id: true },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('toggle', () => {
    it('should create bookmark when not exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue(null);
      mockPrisma.userBookmark.create.mockResolvedValue({
        id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date(),
      });

      const result = await service.toggle('u1', 'l1', new Date().toISOString());
      expect(result.bookmarked).toBe(true);
    });

    it('should delete bookmark when exists', async () => {
      mockPrisma.userBookmark.findUnique.mockResolvedValue({
        id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date(),
      });
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.toggle('u1', 'l1', new Date().toISOString());
      expect(result.bookmarked).toBe(false);
    });
  });

  describe('sync', () => {
    it('should upsert newer bookmarks, delete valid removals, return final state', async () => {
      mockPrisma.scheduleLineup.findMany.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
      mockPrisma.userBookmark.findMany
        .mockResolvedValueOnce([
          { id: 'b1', userId: 'u1', scheduleLineupId: 'l1', checkedAt: new Date('2026-03-11T10:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { id: 'b2', userId: 'u1', scheduleLineupId: 'l2', checkedAt: new Date('2026-03-11T11:00:00Z') },
        ]);
      mockPrisma.userBookmark.upsert.mockResolvedValue({});
      mockPrisma.userBookmark.delete.mockResolvedValue({});

      const result = await service.sync('u1', {
        scheduleId: 's1',
        bookmarks: [{ lineupId: 'l2', checkedAt: '2026-03-11T11:00:00Z' }],
        removals: [{ lineupId: 'l1', removedAt: '2026-03-11T12:00:00Z' }],
      });

      expect(mockPrisma.userBookmark.upsert).toHaveBeenCalled();
      expect(mockPrisma.userBookmark.delete).toHaveBeenCalled();
      expect(result.bookmarks).toEqual(expect.any(Array));
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/server && npx jest bookmark.service.spec --no-coverage`
Expected: FAIL

- [ ] **Step 3: BookmarkService 구현**

```typescript
// apps/server/src/bookmark/bookmark.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySchedule(userId: string, scheduleId: string) {
    const lineups = await this.prisma.scheduleLineup.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    const lineupIds = lineups.map((l) => l.id);

    return this.prisma.userBookmark.findMany({
      where: { userId, scheduleLineupId: { in: lineupIds } },
    });
  }

  async toggle(userId: string, lineupId: string, checkedAt: string) {
    const existing = await this.prisma.userBookmark.findUnique({
      where: { userId_scheduleLineupId: { userId, scheduleLineupId: lineupId } },
    });

    if (existing) {
      await this.prisma.userBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    const bookmark = await this.prisma.userBookmark.create({
      data: { userId, scheduleLineupId: lineupId, checkedAt: new Date(checkedAt) },
    });

    return {
      bookmarked: true,
      bookmark: {
        scheduleLineupId: bookmark.scheduleLineupId,
        checkedAt: bookmark.checkedAt.toISOString(),
      },
    };
  }

  async sync(userId: string, dto: { scheduleId: string; bookmarks: { lineupId: string; checkedAt: string }[]; removals?: { lineupId: string; removedAt: string }[] }) {
    const { scheduleId, bookmarks, removals } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 해당 스케줄의 라인업 ID 조회
      const lineups = await tx.scheduleLineup.findMany({
        where: { scheduleId },
        select: { id: true },
      });
      const lineupIds = lineups.map((l) => l.id);

      // 서버 현재 상태
      const serverRecords = await tx.userBookmark.findMany({
        where: { userId, scheduleLineupId: { in: lineupIds } },
      });
      const serverMap = new Map(
        serverRecords.map((r) => [r.scheduleLineupId, r]),
      );

      // Upsert
      for (const item of bookmarks) {
        const serverRecord = serverMap.get(item.lineupId);
        if (!serverRecord || new Date(item.checkedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.upsert({
            where: { userId_scheduleLineupId: { userId, scheduleLineupId: item.lineupId } },
            update: { checkedAt: new Date(item.checkedAt) },
            create: { userId, scheduleLineupId: item.lineupId, checkedAt: new Date(item.checkedAt) },
          });
        }
      }

      // Delete
      for (const removal of removals ?? []) {
        const serverRecord = serverMap.get(removal.lineupId);
        if (serverRecord && new Date(removal.removedAt) > serverRecord.checkedAt) {
          await tx.userBookmark.delete({ where: { id: serverRecord.id } });
        }
      }

      // 최종 상태 반환
      const finalRecords = await tx.userBookmark.findMany({
        where: { userId, scheduleLineupId: { in: lineupIds } },
      });

      return {
        bookmarks: finalRecords.map((r) => ({
          scheduleLineupId: r.scheduleLineupId,
          checkedAt: r.checkedAt.toISOString(),
        })),
      };
    });
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/server && npx jest bookmark.service.spec --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bookmark/bookmark.service.ts apps/server/src/bookmark/bookmark.service.spec.ts
git commit -m "feat: implement BookmarkService with findBySchedule, toggle, sync"
```

### Task 8: Bookmark Controller

**Files:**
- Create: `apps/server/src/bookmark/bookmark.controller.ts`
- Create: `apps/server/src/bookmark/bookmark.controller.spec.ts`

- [ ] **Step 1: 컨트롤러 테스트 작성**

```typescript
// apps/server/src/bookmark/bookmark.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';

const mockService = {
  findBySchedule: jest.fn(),
  toggle: jest.fn(),
  sync: jest.fn(),
};

describe('BookmarkController', () => {
  let controller: BookmarkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [{ provide: BookmarkService, useValue: mockService }],
    }).compile();

    controller = module.get<BookmarkController>(BookmarkController);
    jest.clearAllMocks();
  });

  it('GET /bookmarks should call findBySchedule', async () => {
    mockService.findBySchedule.mockResolvedValue([]);
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.findAll(headers, 's1');
    expect(mockService.findBySchedule).toHaveBeenCalledWith('u1', 's1');
    expect(result).toEqual({ bookmarks: [] });
  });

  it('PUT /bookmarks/sync should call sync', async () => {
    mockService.sync.mockResolvedValue({ bookmarks: [] });
    const headers = { 'x-user-id': 'u1' };
    const dto = { scheduleId: 's1', bookmarks: [], removals: [] };
    const result = await controller.sync(headers, dto);
    expect(mockService.sync).toHaveBeenCalledWith('u1', dto);
  });

  it('PUT /bookmarks/:lineupId should call toggle', async () => {
    mockService.toggle.mockResolvedValue({ bookmarked: true });
    const headers = { 'x-user-id': 'u1' };
    const result = await controller.toggle(headers, 'l1', { checkedAt: '2026-03-11T10:00:00Z' });
    expect(mockService.toggle).toHaveBeenCalledWith('u1', 'l1', '2026-03-11T10:00:00Z');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/server && npx jest bookmark.controller.spec --no-coverage`
Expected: FAIL

- [ ] **Step 3: BookmarkController 구현**

```typescript
// apps/server/src/bookmark/bookmark.controller.ts
import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { SyncBookmarksDto } from './dto/sync-bookmarks.dto';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('scheduleId') scheduleId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!scheduleId) throw new BadRequestException('scheduleId query parameter is required');
    const records = await this.bookmarkService.findBySchedule(userId, scheduleId);
    return {
      bookmarks: records.map((r) => ({
        scheduleLineupId: r.scheduleLineupId,
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncBookmarksDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.sync(userId, dto);
  }

  @Put(':lineupId')
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('lineupId') lineupId: string,
    @Body() dto: ToggleBookmarkDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.toggle(userId, lineupId, dto.checkedAt);
  }
}
```

> **라우트 순서**: `@Put('sync')`가 `@Put(':lineupId')`보다 먼저 정의.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/server && npx jest bookmark.controller.spec --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bookmark/bookmark.controller.ts apps/server/src/bookmark/bookmark.controller.spec.ts
git commit -m "feat: implement BookmarkController with GET, PUT toggle, PUT sync"
```

### Task 9: Bookmark Module 등록

**Files:**
- Create: `apps/server/src/bookmark/bookmark.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: BookmarkModule 작성**

```typescript
// apps/server/src/bookmark/bookmark.module.ts
import { Module } from '@nestjs/common';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';

@Module({
  controllers: [BookmarkController],
  providers: [BookmarkService],
  exports: [BookmarkService],
})
export class BookmarkModule {}
```

- [ ] **Step 2: AppModule에 BookmarkModule 등록**

`apps/server/src/app.module.ts` 수정:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BookmarkModule } from './bookmark/bookmark.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule, AttendanceModule, BookmarkModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd apps/server && npx nest build`
Expected: 빌드 성공

- [ ] **Step 4: 전체 테스트 실행**

Run: `cd apps/server && npx jest --no-coverage`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/bookmark/bookmark.module.ts apps/server/src/app.module.ts
git commit -m "feat: register BookmarkModule in AppModule"
```

---

## Chunk 4: Shared Types & Final Verification

### Task 10: Shared Types 업데이트

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Attendance, Bookmark 인터페이스 추가**

`packages/shared/src/index.ts` 끝에 추가:

```typescript
export interface ScheduleLineup {
  id: string;
  scheduleId: string;
  artistId: string;
  stageName: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDto {
  scheduleId: string;
  date: string;
  checkedAt: string;
}

export interface BookmarkDto {
  scheduleLineupId: string;
  checkedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add ScheduleLineup, AttendanceDto, BookmarkDto to shared types"
```

### Task 11: 최종 빌드 및 검증

- [ ] **Step 1: 전체 빌드**

Run: `cd apps/server && npx nest build`
Expected: 빌드 성공

- [ ] **Step 2: 전체 테스트**

Run: `cd apps/server && npx jest --no-coverage`
Expected: 모든 테스트 PASS

- [ ] **Step 3: Prisma 스키마 유효성 확인**

Run: `cd apps/server && npx prisma validate`
Expected: 스키마 유효

- [ ] **Step 4: 최종 Commit**

```bash
git add -A
git commit -m "feat: complete personal timetable bookmark feature (server-side)"
```
