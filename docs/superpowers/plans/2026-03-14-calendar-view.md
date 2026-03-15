# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 앱에 월간 캘린더 뷰를 구현하여 아티스트 일정을 날짜별로 탐색할 수 있게 한다.

**Architecture:** 서버(NestJS)에 캘린더 전용 API 추가 → 모바일(React Native + Tamagui)에서 월간 캘린더 그리드 + 날짜별 일정 리스트 + 바텀시트 + 상세 페이지 구현. 기존 코드의 스키마 불일치 버그를 먼저 수정한 후 캘린더 기능을 쌓는다.

**Tech Stack:** NestJS 11, Prisma 7, Jest, React Native 0.83 (Expo SDK 55), Tamagui 2.0-rc, expo-router, @gorhom/bottom-sheet

**Spec:** `docs/superpowers/specs/2026-03-14-calendar-view.md`

**Timezone note:** 서버는 UTC로 날짜를 저장/반환. `dates` map과 클라이언트의 날짜 비교 모두 UTC 기준. KST 변환은 표시 레이어(formatTime 등)에서만 처리. `startDate.slice(0,10)`으로 비교 시 UTC 자정 전후 불일치 가능성 인지 — MVP에서는 허용하고 추후 개선.

---

## Chunk 1: 서버 버그 수정 + 캘린더 API

### Task 1: shared Schedule 타입에서 artistId 제거

**Files:**
- Modify: `packages/shared/src/index.ts:25-38`

- [ ] **Step 1: `Schedule` 인터페이스에서 `artistId` 제거**

```typescript
export interface Schedule {
  id: string;
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

- [ ] **Step 2: shared 패키지 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/shared build`
Expected: 빌드 성공 (또는 스크립트 없으면 tsc로 확인)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "fix(shared): remove artistId from Schedule interface to match Prisma schema"
```

---

### Task 2: schedule.service.ts 기존 쿼리 버그 수정

**Files:**
- Modify: `apps/server/src/schedule/schedule.service.ts`
- Modify: `apps/server/src/schedule/dto/create-schedule.dto.ts`

- [ ] **Step 1: `CreateScheduleDto`에서 `artistId`를 optional로 변경**

```typescript
// apps/server/src/schedule/dto/create-schedule.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsNotEmpty } from 'class-validator';
import { ScheduleType } from '@ipchun/shared';

export class CreateScheduleDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
```

> `UpdateScheduleDto`는 `OmitType(CreateScheduleDto, ['artistId'])`를 사용하므로 영향 없음.

- [ ] **Step 2: `schedule.service.ts` 전체 수정**

`include: { artist: true }` → `include: { lineups: { include: { artist: true } } }` 로 모든 메서드 변경.
`create`는 DTO에서 `artistId` 분리 후 트랜잭션으로 Schedule + ScheduleLineup 생성.
`findByArtist`는 `lineups: { some: { artistId } }` 조건 사용.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const SCHEDULE_INCLUDE = {
  lineups: {
    include: { artist: true },
    orderBy: { performanceOrder: 'asc' as const },
  },
};

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto) {
    const { artistId, ...scheduleData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({ data: scheduleData });
      if (artistId) {
        await tx.scheduleLineup.create({
          data: { scheduleId: schedule.id, artistId },
        });
      }
      return tx.schedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  findAll() {
    return this.prisma.schedule.findMany({
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
  }

  findByArtist(artistId: string) {
    return this.prisma.schedule.findMany({
      where: { lineups: { some: { artistId } } },
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.schedule.findUniqueOrThrow({
      where: { id },
      include: SCHEDULE_INCLUDE,
    });
  }

  update(id: string, dto: UpdateScheduleDto) {
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: SCHEDULE_INCLUDE,
    });
  }

  remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: 서버 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter server build`
Expected: 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/schedule/schedule.service.ts apps/server/src/schedule/dto/create-schedule.dto.ts
git commit -m "fix(server): fix schedule service queries and make CreateScheduleDto.artistId optional"
```

---

### Task 3: 캘린더 전용 DTO 작성

**Files:**
- Create: `apps/server/src/schedule/dto/calendar-query.dto.ts`

- [ ] **Step 1: CalendarQueryDto 작성**

```typescript
import { IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsUUID()
  artistId?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/schedule/dto/calendar-query.dto.ts
git commit -m "feat(server): add CalendarQueryDto for calendar endpoint validation"
```

---

### Task 4: 캘린더 서비스 메서드 — 테스트 작성

**Files:**
- Create: `apps/server/src/schedule/schedule.service.spec.ts`

- [ ] **Step 1: 테스트 파일 작성**

기존 attendance.service.spec.ts 패턴을 따라 PrismaService 모킹.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  schedule: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  scheduleLineup: {
    create: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    jest.clearAllMocks();
  });

  describe('findCalendar', () => {
    it('should query schedules within the given month range', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.findCalendar({ year: 2026, month: 3 });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.OR).toHaveLength(3);
      // monthStart = 2026-03-01, monthEnd = 2026-04-01
      expect(call.where.OR[0].startDate.gte).toEqual(new Date('2026-03-01T00:00:00.000Z'));
      expect(call.where.OR[0].startDate.lt).toEqual(new Date('2026-04-01T00:00:00.000Z'));
      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
      expect(result.schedules).toEqual([]);
      expect(result.dates).toEqual({});
    });

    it('should filter by artistId when provided', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([]);

      await service.findCalendar({ year: 2026, month: 3, artistId: 'a1' });

      const call = mockPrisma.schedule.findMany.mock.calls[0][0];
      expect(call.where.lineups).toEqual({ some: { artistId: 'a1' } });
    });

    it('should build dates map from schedule data including multi-day events', async () => {
      mockPrisma.schedule.findMany.mockResolvedValue([
        {
          id: 's1',
          title: '페스티벌',
          type: 'FESTIVAL',
          startDate: new Date('2026-03-15T00:00:00Z'),
          endDate: new Date('2026-03-17T23:59:00Z'),
          lineups: [],
        },
        {
          id: 's2',
          title: '콘서트',
          type: 'CONCERT',
          startDate: new Date('2026-03-15T19:00:00Z'),
          endDate: null,
          lineups: [],
        },
      ]);

      const result = await service.findCalendar({ year: 2026, month: 3 });

      expect(result.dates['2026-03-15']).toContain('FESTIVAL');
      expect(result.dates['2026-03-15']).toContain('CONCERT');
      expect(result.dates['2026-03-16']).toContain('FESTIVAL');
      expect(result.dates['2026-03-17']).toContain('FESTIVAL');
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest src/schedule/schedule.service.spec.ts --verbose`
Expected: FAIL — `service.findCalendar is not a function`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schedule/schedule.service.spec.ts
git commit -m "test(server): add schedule service tests for findCalendar method"
```

---

### Task 5: 캘린더 서비스 메서드 — 구현

**Files:**
- Modify: `apps/server/src/schedule/schedule.service.ts`

- [ ] **Step 1: `findCalendar` 메서드 추가**

`schedule.service.ts`의 `remove` 메서드 뒤에 추가:

```typescript
  async findCalendar(params: { year: number; month: number; artistId?: string }) {
    const { year, month, artistId } = params;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const schedules = await this.prisma.schedule.findMany({
      where: {
        OR: [
          { startDate: { gte: monthStart, lt: monthEnd } },
          { endDate: { gte: monthStart, lt: monthEnd } },
          { startDate: { lt: monthStart }, endDate: { gt: monthEnd } },
        ],
        ...(artistId && { lineups: { some: { artistId } } }),
      },
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });

    // Build dates map
    const dates: Record<string, string[]> = {};
    for (const schedule of schedules) {
      const start = new Date(schedule.startDate);
      const end = schedule.endDate ? new Date(schedule.endDate) : start;

      const dayStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const dayEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

      for (let d = new Date(dayStart); d <= dayEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d >= monthStart && d < monthEnd) {
          const key = d.toISOString().slice(0, 10);
          if (!dates[key]) dates[key] = [];
          if (!dates[key].includes(schedule.type)) {
            dates[key].push(schedule.type);
          }
        }
      }
    }

    return { year, month, schedules, dates };
  }
```

- [ ] **Step 2: 테스트 실행 — 통과 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest src/schedule/schedule.service.spec.ts --verbose`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schedule/schedule.service.ts
git commit -m "feat(server): implement findCalendar method with dates map for multi-day events"
```

---

### Task 6: 캘린더 컨트롤러 엔드포인트 — 테스트 작성

**Files:**
- Create: `apps/server/src/schedule/schedule.controller.spec.ts`

- [ ] **Step 1: 컨트롤러 테스트 작성**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByArtist: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findCalendar: jest.fn(),
};

describe('ScheduleController', () => {
  let controller: ScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [{ provide: ScheduleService, useValue: mockService }],
    }).compile();

    controller = module.get<ScheduleController>(ScheduleController);
    jest.clearAllMocks();
  });

  describe('GET /schedules/calendar', () => {
    it('should call findCalendar with year, month', async () => {
      const mockResult = { year: 2026, month: 3, schedules: [], dates: {} };
      mockService.findCalendar.mockResolvedValue(mockResult);

      const result = await controller.getCalendar({ year: 2026, month: 3 });

      expect(mockService.findCalendar).toHaveBeenCalledWith({ year: 2026, month: 3, artistId: undefined });
      expect(result).toEqual(mockResult);
    });

    it('should pass artistId when provided', async () => {
      const mockResult = { year: 2026, month: 3, schedules: [], dates: {} };
      mockService.findCalendar.mockResolvedValue(mockResult);

      await controller.getCalendar({ year: 2026, month: 3, artistId: 'a1' });

      expect(mockService.findCalendar).toHaveBeenCalledWith({ year: 2026, month: 3, artistId: 'a1' });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest src/schedule/schedule.controller.spec.ts --verbose`
Expected: FAIL — `controller.getCalendar is not a function`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schedule/schedule.controller.spec.ts
git commit -m "test(server): add schedule controller tests for calendar endpoint"
```

---

### Task 7: 캘린더 컨트롤러 엔드포인트 — 구현

**Files:**
- Modify: `apps/server/src/schedule/schedule.controller.ts`

- [ ] **Step 1: `getCalendar` 엔드포인트 추가**

`calendar` 라우트는 `:id` 라우트보다 **위에** 배치해야 함 (NestJS 라우트 순서 규칙).

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get('calendar')
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.scheduleService.findCalendar({
      year: query.year,
      month: query.month,
      artistId: query.artistId,
    });
  }

  @Get()
  findAll(@Query('artistId') artistId?: string) {
    if (artistId) {
      return this.scheduleService.findByArtist(artistId);
    }
    return this.scheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }
}
```

- [ ] **Step 2: 컨트롤러 테스트 통과 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest src/schedule/schedule.controller.spec.ts --verbose`
Expected: PASS

- [ ] **Step 3: 서비스 테스트도 여전히 통과 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest src/schedule/ --verbose`
Expected: PASS (모든 schedule 테스트)

- [ ] **Step 4: 서버 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter server build`
Expected: 빌드 성공

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/schedule/schedule.controller.ts apps/server/src/schedule/dto/calendar-query.dto.ts
git commit -m "feat(server): add GET /schedules/calendar endpoint with month range and artistId filter"
```

---

## Chunk 2: 모바일 — API 클라이언트 + 캘린더 화면

### Task 8: 모바일 API 클라이언트 생성

**Files:**
- Create: `apps/mobile/src/api/client.ts`

- [ ] **Step 1: API 클라이언트 작성**

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  schedules: {
    getCalendar(year: number, month: number, artistId?: string) {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (artistId) params.set('artistId', artistId);
      return request<CalendarResponse>(`/schedules/calendar?${params}`);
    },
    getOne(id: string) {
      return request<ScheduleDetail>(`/schedules/${id}`);
    },
  },
};

// Response types
export interface CalendarSchedule {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  lineups: Array<{
    id: string;
    artistId: string;
    stageName: string | null;
    startTime: string | null;
    endTime: string | null;
    performanceOrder: number | null;
    artist: {
      id: string;
      name: string;
      imageUrl: string | null;
      genre: string | null;
    };
  }>;
}

export interface CalendarResponse {
  year: number;
  month: number;
  schedules: CalendarSchedule[];
  dates: Record<string, string[]>;
}

export type ScheduleDetail = CalendarSchedule;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/api/client.ts
git commit -m "feat(mobile): add API client with calendar and schedule endpoints"
```

---

### Task 9: 일정 타입 색상 상수 생성

**Files:**
- Create: `apps/mobile/src/constants/schedule.ts`

- [ ] **Step 1: 상수 파일 작성**

```typescript
export const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  CONCERT: '#FF6B6B',
  BUSKING: '#FFD93D',
  FESTIVAL: '#6BCB77',
  RELEASE: '#4D96FF',
  OTHER: '#A8A8A8',
};

export const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  CONCERT: '콘서트',
  BUSKING: '버스킹',
  FESTIVAL: '페스티벌',
  RELEASE: '발매',
  OTHER: '기타',
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/constants/schedule.ts
git commit -m "feat(mobile): add schedule type color and label constants"
```

---

### Task 10: CalendarHeader 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { XStack, Text, Button } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarHeader({ year, month, onPrev, onNext }: CalendarHeaderProps) {
  const theme = useTheme();

  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
      <Button size="$3" circular chromeless onPress={onPrev}>
        <Ionicons name="chevron-back" size={20} color={theme.color.val} />
      </Button>
      <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="$color">
        {year}년 {month}월
      </Text>
      <Button size="$3" circular chromeless onPress={onNext}>
        <Ionicons name="chevron-forward" size={20} color={theme.color.val} />
      </Button>
    </XStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/CalendarHeader.tsx
git commit -m "feat(mobile): add CalendarHeader component with month navigation"
```

---

### Task 11: CalendarDayCell 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/CalendarDayCell.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { YStack, XStack, Text } from 'tamagui';
import { SCHEDULE_TYPE_COLORS } from '../constants/schedule';

interface CalendarDayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  types: string[];
  onPress: () => void;
}

export function CalendarDayCell({ day, isCurrentMonth, isToday, isSelected, types, onPress }: CalendarDayCellProps) {
  const maxDots = 3;
  const visibleTypes = types.slice(0, maxDots);

  return (
    <YStack
      flex={1}
      alignItems="center"
      paddingVertical="$1"
      onPress={onPress}
      backgroundColor={isSelected ? '$accentColorSubtle' : 'transparent'}
      borderRadius="$sm"
      minHeight={44}
    >
      <Text
        fontSize={14}
        fontFamily="$body"
        color={!isCurrentMonth ? '$colorTertiary' : isToday ? '$accentColor' : '$color'}
        fontWeight={isToday ? '700' : '400'}
      >
        {day}
      </Text>
      <XStack gap={2} marginTop={2} height={6} alignItems="center">
        {visibleTypes.map((type, i) => (
          <YStack
            key={i}
            width={5}
            height={5}
            borderRadius={999}
            backgroundColor={SCHEDULE_TYPE_COLORS[type] ?? SCHEDULE_TYPE_COLORS.OTHER}
          />
        ))}
        {types.length > maxDots && (
          <Text fontSize={8} color="$colorSecondary">+{types.length - maxDots}</Text>
        )}
      </XStack>
    </YStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/CalendarDayCell.tsx
git commit -m "feat(mobile): add CalendarDayCell component with color dots"
```

---

### Task 12: CalendarGrid 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/CalendarGrid.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { YStack, XStack, Text } from 'tamagui';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate: string | null;
  dates: Record<string, string[]>;
  onSelectDate: (date: string) => void;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const prevMonthLast = new Date(year, month - 1, 0).getDate();

  const days: Array<{ day: number; month: number; year: number }> = [];

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month - 1 <= 0 ? 12 : month - 1;
    const y = month - 1 <= 0 ? year - 1 : year;
    days.push({ day: d, month: m, year: y });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, month, year });
  }

  // Next month days (fill to 42 = 6 weeks)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1 > 12 ? 1 : month + 1;
    const y = month + 1 > 12 ? year + 1 : year;
    days.push({ day: d, month: m, year: y });
  }

  return days;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarGrid({ year, month, selectedDate, dates, onSelectDate }: CalendarGridProps) {
  const days = getCalendarDays(year, month);
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <YStack>
      {/* Weekday header */}
      <XStack>
        {WEEKDAYS.map((wd) => (
          <YStack key={wd} flex={1} alignItems="center" paddingVertical="$1">
            <Text fontSize={12} fontFamily="$body" color="$colorSecondary">{wd}</Text>
          </YStack>
        ))}
      </XStack>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <XStack key={wi}>
          {week.map((d, di) => {
            const dateKey = formatDateKey(d.year, d.month, d.day);
            return (
              <CalendarDayCell
                key={di}
                day={d.day}
                isCurrentMonth={d.month === month && d.year === year}
                isToday={dateKey === todayKey}
                isSelected={dateKey === selectedDate}
                types={dates[dateKey] ?? []}
                onPress={() => onSelectDate(dateKey)}
              />
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/CalendarGrid.tsx
git commit -m "feat(mobile): add CalendarGrid component with 6-week grid and date selection"
```

---

### Task 13: ScheduleCard 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/ScheduleCard.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { XStack, YStack, Text } from 'tamagui';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../constants/schedule';
import type { CalendarSchedule } from '../api/client';

interface ScheduleCardProps {
  schedule: CalendarSchedule;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ScheduleCard({ schedule, onPress }: ScheduleCardProps) {
  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;
  const artistCount = schedule.lineups.length;

  return (
    <XStack
      backgroundColor="$backgroundElevated"
      borderRadius="$md"
      padding="$3"
      gap="$3"
      onPress={onPress}
      pressStyle={{ opacity: 0.8 }}
    >
      {/* Color indicator bar */}
      <YStack width={4} borderRadius="$full" backgroundColor={typeColor} />

      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={10} fontFamily="$body" color={typeColor} fontWeight="600">
            {typeLabel}
          </Text>
        </XStack>
        <Text fontSize={15} fontFamily="$heading" fontWeight="600" color="$color" numberOfLines={1}>
          {schedule.title}
        </Text>
        <XStack gap="$2" alignItems="center">
          <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
            {formatTime(schedule.startDate)}
            {schedule.endDate && ` ~ ${formatTime(schedule.endDate)}`}
          </Text>
        </XStack>
        {schedule.location && (
          <Text fontSize={12} fontFamily="$body" color="$colorTertiary" numberOfLines={1}>
            {schedule.location}
          </Text>
        )}
        {artistCount > 0 && (
          <Text fontSize={11} fontFamily="$body" color="$colorSecondary" marginTop="$1">
            아티스트 {artistCount}팀
          </Text>
        )}
      </YStack>
    </XStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/ScheduleCard.tsx
git commit -m "feat(mobile): add ScheduleCard component with type color indicator"
```

---

### Task 14: ScheduleList 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/ScheduleList.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { YStack, Text } from 'tamagui';
import { ScheduleCard } from './ScheduleCard';
import type { CalendarSchedule } from '../api/client';

interface ScheduleListProps {
  date: string;
  schedules: CalendarSchedule[];
  onSchedulePress: (schedule: CalendarSchedule) => void;
}

export function ScheduleList({ date, schedules, onSchedulePress }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <YStack padding="$8" alignItems="center">
        <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
          일정이 없습니다
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$2" padding="$4">
      {schedules.map((s) => (
        <ScheduleCard key={s.id} schedule={s} onPress={() => onSchedulePress(s)} />
      ))}
    </YStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/ScheduleList.tsx
git commit -m "feat(mobile): add ScheduleList component with empty state"
```

---

### Task 15: @gorhom/bottom-sheet 설치

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: 패키지 설치**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/mobile && pnpm add @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated`

> `react-native-gesture-handler`와 `react-native-reanimated`는 @gorhom/bottom-sheet의 peer dependency. Expo에 이미 포함되어 있으면 설치 스킵.

- [ ] **Step 2: root `_layout.tsx`에 `GestureHandlerRootView` 래핑**

`apps/mobile/app/_layout.tsx`의 최상위를 `GestureHandlerRootView`로 감싸야 함. `@gorhom/bottom-sheet` 공식 권장 패턴. 캘린더 화면 내부가 아닌 앱 전체에서 한 번만 감싼다.

```tsx
// app/_layout.tsx의 return 부분에서 최상위를 GestureHandlerRootView로 감싸기
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 기존 return을 <GestureHandlerRootView style={{ flex: 1 }}> ... </GestureHandlerRootView>로 감싸기
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json ../../pnpm-lock.yaml
git commit -m "chore(mobile): add @gorhom/bottom-sheet dependency"
```

---

### Task 16: ScheduleBottomSheet 컴포넌트

**Files:**
- Create: `apps/mobile/src/components/calendar/ScheduleBottomSheet.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { useCallback, useMemo, useRef } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Button } from 'tamagui';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from 'tamagui';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../constants/schedule';
import type { CalendarSchedule } from '../api/client';

interface ScheduleBottomSheetProps {
  schedule: CalendarSchedule | null;
  onClose: () => void;
  onDetail: (id: string) => void;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function ScheduleBottomSheet({ schedule, onClose, onDetail }: ScheduleBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  if (!schedule) return null;

  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.backgroundElevated.val }}
      handleIndicatorStyle={{ backgroundColor: theme.colorTertiary.val }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <ScrollView>
          <YStack padding="$4" gap="$3">
            {/* Schedule image */}
            {schedule.imageUrl && (
              <Image source={{ uri: schedule.imageUrl }} width="100%" height={160} borderRadius="$md" />
            )}

            {/* Title + Badge */}
            <XStack alignItems="center" gap="$2">
              <YStack backgroundColor={typeColor} paddingHorizontal="$2" paddingVertical={2} borderRadius="$sm">
                <Text fontSize={10} fontWeight="700" color="#FFFFFF">{typeLabel}</Text>
              </YStack>
            </XStack>
            <Text fontFamily="$heading" fontSize={20} fontWeight="700" color="$color">
              {schedule.title}
            </Text>

            {/* Date/Time */}
            <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
              {formatDateTime(schedule.startDate)}
              {schedule.endDate && ` ~ ${formatDateTime(schedule.endDate)}`}
            </Text>

            {/* Location */}
            {schedule.location && (
              <YStack gap="$1">
                <Text fontFamily="$body" fontSize={14} color="$color">{schedule.location}</Text>
                {schedule.address && (
                  <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{schedule.address}</Text>
                )}
              </YStack>
            )}

            {/* Lineups */}
            {schedule.lineups.length > 0 && (
              <YStack gap="$2" marginTop="$2">
                <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
                  라인업 ({schedule.lineups.length})
                </Text>
                {schedule.lineups.map((lineup) => (
                  <XStack key={lineup.id} gap="$3" alignItems="center" paddingVertical="$1">
                    {lineup.artist.imageUrl ? (
                      <Image
                        source={{ uri: lineup.artist.imageUrl }}
                        width={36}
                        height={36}
                        borderRadius={999}
                      />
                    ) : (
                      <YStack width={36} height={36} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                        <Text fontSize={14} color="$colorTertiary">🎵</Text>
                      </YStack>
                    )}
                    <YStack flex={1}>
                      <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">
                        {lineup.artist.name}
                      </Text>
                      <XStack gap="$2">
                        {lineup.stageName && (
                          <Text fontSize={11} fontFamily="$body" color="$colorTertiary">{lineup.stageName}</Text>
                        )}
                        {lineup.startTime && (
                          <Text fontSize={11} fontFamily="$body" color="$colorSecondary">
                            {formatDateTime(lineup.startTime)}
                            {lineup.endTime && ` ~ ${formatDateTime(lineup.endTime)}`}
                          </Text>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            )}

            {/* Detail button */}
            <Button
              marginTop="$3"
              backgroundColor="$accentColor"
              color="#FFFFFF"
              fontFamily="$heading"
              fontWeight="700"
              onPress={() => onDetail(schedule.id)}
            >
              상세 보기
            </Button>
          </YStack>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/calendar/ScheduleBottomSheet.tsx
git commit -m "feat(mobile): add ScheduleBottomSheet component with lineup list and detail button"
```

---

## Chunk 3: 모바일 — 캘린더 화면 조립 + 상세 페이지

### Task 17: 캘린더 탭 화면 (schedules.tsx → 캘린더)

**Files:**
- Modify: `apps/mobile/app/(tabs)/schedules.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: `schedules.tsx`를 캘린더 화면으로 교체**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { YStack, Text, ScrollView, Spinner } from 'tamagui';
import { CalendarHeader } from '../../src/components/calendar/CalendarHeader';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';
import { ScheduleList } from '../../src/components/calendar/ScheduleList';
import { ScheduleBottomSheet } from '../../src/components/calendar/ScheduleBottomSheet';
import { api } from '../../src/api/client';
import type { CalendarResponse, CalendarSchedule } from '../../src/api/client';
import { useRouter } from 'expo-router';

function getSchedulesForDate(schedules: CalendarSchedule[], dateKey: string): CalendarSchedule[] {
  return schedules
    .filter((s) => {
      const start = s.startDate.slice(0, 10);
      const end = s.endDate ? s.endDate.slice(0, 10) : start;
      return dateKey >= start && dateKey <= end;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export default function CalendarScreen() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<CalendarSchedule | null>(null);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.schedules.getCalendar(y, m);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  // Auto-select today when current month
  useEffect(() => {
    if (data && year === now.getFullYear() && month === now.getMonth() + 1) {
      const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setSelectedDate(todayKey);
    }
  }, [data]);

  const handlePrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else { setMonth(month - 1); }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else { setMonth(month + 1); }
    setSelectedDate(null);
  };

  const selectedSchedules = selectedDate && data
    ? getSchedulesForDate(data.schedules, selectedDate)
    : [];

  return (
      <YStack flex={1} backgroundColor="$background">
        <CalendarHeader year={year} month={month} onPrev={handlePrev} onNext={handleNext} />

        {loading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" color="$accentColor" />
          </YStack>
        ) : error ? (
          <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
            <Text fontFamily="$body" color="$negativeColor" textAlign="center">{error}</Text>
            <Text
              fontFamily="$body"
              color="$accentColor"
              marginTop="$3"
              onPress={() => fetchCalendar(year, month)}
            >
              다시 시도
            </Text>
          </YStack>
        ) : (
          <ScrollView>
            <CalendarGrid
              year={year}
              month={month}
              selectedDate={selectedDate}
              dates={data?.dates ?? {}}
              onSelectDate={setSelectedDate}
            />
            {selectedDate && (
              <ScheduleList
                date={selectedDate}
                schedules={selectedSchedules}
                onSchedulePress={setSelectedSchedule}
              />
            )}
          </ScrollView>
        )}

        <ScheduleBottomSheet
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onDetail={(id) => {
            setSelectedSchedule(null);
            router.push(`/schedules/${id}`);
          }}
        />
      </YStack>
  );
}
```

- [ ] **Step 2: `_layout.tsx` 탭 제목 변경**

`title: '일정'` → `title: '캘린더'`

```tsx
      <Tabs.Screen
        name="schedules"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
```

- [ ] **Step 3: Expo 앱 실행하여 화면 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm dev:mobile`
Expected: 캘린더 탭에서 월간 캘린더 그리드가 표시됨 (서버 미실행 시 에러 표시 + 재시도 버튼)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/schedules.tsx apps/mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): replace empty schedules tab with calendar view"
```

---

### Task 18: 일정 상세 페이지

**Files:**
- Create: `apps/mobile/app/schedules/[id].tsx`

- [ ] **Step 1: 상세 페이지 작성**

```tsx
import { useState, useEffect } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Spinner } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { CalendarSchedule } from '../../src/api/client';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../../src/constants/schedule';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<CalendarSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.schedules.getOne(id)
      .then(setSchedule)
      .catch((e) => setError(e instanceof Error ? e.message : '불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !schedule) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$4">
        <Text fontFamily="$body" color="$negativeColor">{error ?? '일정을 찾을 수 없습니다'}</Text>
      </YStack>
    );
  }

  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;

  return (
    <ScrollView backgroundColor="$background">
      {/* Hero image */}
      {schedule.imageUrl && (
        <Image source={{ uri: schedule.imageUrl }} width="100%" height={220} />
      )}

      <YStack padding="$4" gap="$3">
        {/* Type badge + title */}
        <XStack alignItems="center" gap="$2">
          <YStack backgroundColor={typeColor} paddingHorizontal="$2" paddingVertical={2} borderRadius="$sm">
            <Text fontSize={10} fontWeight="700" color="#FFFFFF">{typeLabel}</Text>
          </YStack>
        </XStack>
        <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$color">
          {schedule.title}
        </Text>

        {/* Date/Time */}
        <YStack gap="$1">
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
            {formatDate(schedule.startDate)} {formatTime(schedule.startDate)}
            {schedule.endDate && ` ~ ${formatDate(schedule.endDate)} ${formatTime(schedule.endDate)}`}
          </Text>
        </YStack>

        {/* Location */}
        {schedule.location && (
          <YStack gap="$1">
            <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">{schedule.location}</Text>
            {schedule.address && (
              <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{schedule.address}</Text>
            )}
          </YStack>
        )}

        {/* Description */}
        {schedule.description && (
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary" lineHeight={22}>
            {schedule.description}
          </Text>
        )}

        {/* Lineup */}
        {schedule.lineups.length > 0 && (
          <YStack gap="$3" marginTop="$2">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color="$color">
              라인업 ({schedule.lineups.length})
            </Text>
            {schedule.lineups.map((lineup) => (
              <XStack
                key={lineup.id}
                gap="$3"
                alignItems="center"
                paddingVertical="$2"
                onPress={() => router.push(`/artists/${lineup.artist.id}`)}
                pressStyle={{ opacity: 0.7 }}
              >
                {lineup.artist.imageUrl ? (
                  <Image source={{ uri: lineup.artist.imageUrl }} width={44} height={44} borderRadius={999} />
                ) : (
                  <YStack width={44} height={44} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                    <Text fontSize={18} color="$colorTertiary">🎵</Text>
                  </YStack>
                )}
                <YStack flex={1}>
                  <Text fontFamily="$body" fontSize={15} fontWeight="600" color="$color">
                    {lineup.artist.name}
                  </Text>
                  <XStack gap="$2">
                    {lineup.stageName && (
                      <Text fontSize={12} fontFamily="$body" color="$colorTertiary">{lineup.stageName}</Text>
                    )}
                    {lineup.startTime && (
                      <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
                        {formatTime(lineup.startTime)}
                        {lineup.endTime && ` ~ ${formatTime(lineup.endTime)}`}
                      </Text>
                    )}
                  </XStack>
                </YStack>
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
```

- [ ] **Step 2: root _layout.tsx에 schedules/[id] 스택 확인**

현재 `app/_layout.tsx`에 Stack이 설정되어 있으므로, `app/schedules/[id].tsx`는 자동으로 스택 네비게이션으로 동작. 별도 수정 불필요할 수 있으나, 헤더 제목 설정이 필요하면 `Stack.Screen` 옵션 추가.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/schedules/[id].tsx
git commit -m "feat(mobile): add schedule detail page with hero image, lineup, and artist links"
```

---

### Task 19: 최종 통합 테스트

- [ ] **Step 1: 서버 전체 테스트**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/server && npx jest --verbose`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 서버 빌드**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm --filter server build`
Expected: 빌드 성공

- [ ] **Step 3: 서버 + 모바일 동시 실행 확인**

Run (터미널 1): `cd /Users/sanghyeon/projects/ipchun && pnpm dev:server`
Run (터미널 2): `cd /Users/sanghyeon/projects/ipchun && pnpm dev:mobile`

Expected:
1. 캘린더 탭에 월간 그리드 표시
2. 날짜 선택 시 하단 리스트 표시
3. 일정 카드 탭 시 바텀시트 표시
4. "상세 보기" → 상세 페이지 이동
5. 라인업의 아티스트 탭 → 아티스트 상세 페이지 이동

- [ ] **Step 4: 최종 커밋 (필요 시)**

누락된 파일이 있으면 추가 커밋.
