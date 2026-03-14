# 아티스트 상세 화면 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 앱에서 아티스트 소개 + 일정 목록(upcoming/past)을 보여주는 상세 화면 구현

**Architecture:** 서버의 기존 `GET /schedules` API에 `period`/`cursor`/`limit` 파라미터를 추가하여 페이지네이션 지원. 모바일 클라이언트는 기존 `api/client.ts`를 확장하여 아티스트 조회 + 일정 조회를 병렬 호출하고, Tamagui 기반 UI로 렌더링.

**Tech Stack:** NestJS 11, Prisma 7, React Native (Expo SDK 55), Tamagui 2, expo-router

**Spec:** `docs/superpowers/specs/2026-03-14-artist-detail-screen-design.md`

---

## File Structure

### Server (apps/server)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/schedule/dto/find-schedules-query.dto.ts` | Create | 쿼리 파라미터 DTO (artistId, period, cursor, limit) |
| `src/schedule/schedule.service.ts` | Modify | `findByArtist`에 period/cursor/limit 로직 추가 |
| `src/schedule/schedule.controller.ts` | Modify | `findAll`에서 DTO 사용, period 분기 처리 |
| `src/schedule/schedule.service.spec.ts` | Modify | period/cursor/limit 테스트 추가 |
| `src/schedule/schedule.controller.spec.ts` | Modify | 컨트롤러 테스트 추가 |

### Shared (packages/shared)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/index.ts` | Modify | `PaginatedResponse<T>` 인터페이스 추가 |

### Mobile (apps/mobile)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/api/client.ts` | Modify | artists, schedules(period) API 메서드 추가 |
| `app/artists/[id].tsx` | Modify | 아티스트 상세 화면 전체 구현 |

---

## Chunk 1: 서버 API 확장

### Task 1: FindSchedulesQueryDto 생성

**Files:**
- Create: `apps/server/src/schedule/dto/find-schedules-query.dto.ts`

- [ ] **Step 1: DTO 파일 생성**

```typescript
// apps/server/src/schedule/dto/find-schedules-query.dto.ts
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsOptional()
  @IsIn(['upcoming', 'past'])
  period?: 'upcoming' | 'past';

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/schedule/dto/find-schedules-query.dto.ts
git commit -m "feat(schedule): add FindSchedulesQueryDto for period/cursor/limit"
```

---

### Task 2: ScheduleService에 period/cursor/limit 지원 추가

**Files:**
- Modify: `apps/server/src/schedule/schedule.service.ts:40-46`
- Modify: `apps/server/src/schedule/schedule.service.spec.ts`

- [ ] **Step 1: 서비스 테스트 작성 — upcoming period**

`apps/server/src/schedule/schedule.service.spec.ts`의 기존 `describe` 블록 안에 새 describe 추가:

```typescript
describe('findByArtist', () => {
  it('should return upcoming schedules sorted ascending when period is upcoming', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    await service.findByArtist('artist-1', { period: 'upcoming' });

    const call = mockPrisma.schedule.findMany.mock.calls[0][0];
    expect(call.where.lineups).toEqual({ some: { artistId: 'artist-1' } });
    expect(call.where.startDate.gte).toBeDefined();
    expect(call.orderBy.startDate).toBe('asc');
  });

  it('should return past schedules sorted descending with limit when period is past', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    await service.findByArtist('artist-1', { period: 'past', limit: 5 });

    const call = mockPrisma.schedule.findMany.mock.calls[0][0];
    expect(call.where.startDate.lt).toBeDefined();
    expect(call.orderBy.startDate).toBe('desc');
    expect(call.take).toBe(6); // limit + 1 for nextCursor detection
  });

  it('should handle cursor-based pagination using (startDate, id) composite cursor', async () => {
    const cursorSchedule = {
      startDate: new Date('2026-02-01T00:00:00Z'),
    };
    mockPrisma.schedule.findUniqueOrThrow.mockResolvedValue(cursorSchedule);
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    await service.findByArtist('artist-1', { period: 'past', cursor: 'cursor-id', limit: 10 });

    const call = mockPrisma.schedule.findMany.mock.calls[0][0];
    // Uses OR to handle same-date schedules: (startDate < cursor) OR (startDate == cursor AND id < cursor)
    expect(call.where.OR).toBeDefined();
    expect(call.where.OR).toHaveLength(2);
  });

  it('should return all schedules ascending when no period specified', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);

    await service.findByArtist('artist-1');

    const call = mockPrisma.schedule.findMany.mock.calls[0][0];
    expect(call.where.startDate).toBeUndefined();
    expect(call.orderBy.startDate).toBe('asc');
  });

  it('should detect nextCursor when more results exist', async () => {
    const schedules = Array.from({ length: 11 }, (_, i) => ({
      id: `s${i}`,
      startDate: new Date(`2026-01-${String(10 - i).padStart(2, '0')}T00:00:00Z`),
    }));
    mockPrisma.schedule.findMany.mockResolvedValue(schedules);

    const result = await service.findByArtist('artist-1', { period: 'past', limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.nextCursor).toBe('s9');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/server && npx jest src/schedule/schedule.service.spec.ts --verbose`
Expected: FAIL — `findByArtist` signature doesn't accept options parameter

- [ ] **Step 3: 서비스 구현**

`apps/server/src/schedule/schedule.service.ts`에서 `findByArtist` 메서드를 수정:

```typescript
async findByArtist(
  artistId: string,
  options?: { period?: 'upcoming' | 'past'; cursor?: string; limit?: number },
) {
  const { period, cursor, limit = 10 } = options ?? {};

  // No period: return all (backward compatible)
  if (!period) {
    return this.prisma.schedule.findMany({
      where: { lineups: { some: { artistId } } },
      include: SCHEDULE_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
  }

  const now = new Date();
  const isUpcoming = period === 'upcoming';

  const take = isUpcoming ? undefined : limit + 1;
  const baseWhere = { lineups: { some: { artistId } } };

  let where: Record<string, unknown>;

  if (cursor && !isUpcoming) {
    // Composite cursor: (startDate, id) to avoid skipping same-date schedules
    const cursorSchedule = await this.prisma.schedule.findUniqueOrThrow({
      where: { id: cursor },
      select: { startDate: true },
    });
    where = {
      ...baseWhere,
      OR: [
        { startDate: { lt: cursorSchedule.startDate } },
        { startDate: cursorSchedule.startDate, id: { lt: cursor } },
      ],
    };
  } else {
    where = {
      ...baseWhere,
      ...(isUpcoming
        ? { startDate: { gte: now } }
        : { startDate: { lt: now } }),
    };
  }

  const schedules = await this.prisma.schedule.findMany({
    where,
    include: SCHEDULE_INCLUDE,
    orderBy: [{ startDate: isUpcoming ? 'asc' : 'desc' }, { id: isUpcoming ? 'asc' : 'desc' }],
    ...(take && { take }),
  });

  // Upcoming: return all
  if (isUpcoming) {
    return { data: schedules, nextCursor: null };
  }

  // Past: check for next page
  const hasMore = schedules.length > limit;
  const data = hasMore ? schedules.slice(0, limit) : schedules;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd apps/server && npx jest src/schedule/schedule.service.spec.ts --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/schedule/schedule.service.ts apps/server/src/schedule/schedule.service.spec.ts
git commit -m "feat(schedule): add period/cursor/limit to findByArtist"
```

---

### Task 3: ScheduleController에 DTO 적용

**Files:**
- Modify: `apps/server/src/schedule/schedule.controller.ts:34-40`
- Modify: `apps/server/src/schedule/schedule.controller.spec.ts`

- [ ] **Step 1: 컨트롤러 테스트 작성**

`apps/server/src/schedule/schedule.controller.spec.ts`에 추가:

```typescript
describe('GET /schedules', () => {
  it('should call findByArtist with options when artistId and period provided', async () => {
    mockService.findByArtist.mockResolvedValue({ data: [], nextCursor: null });

    const query = { artistId: 'a1', period: 'upcoming' as const };
    const result = await controller.findAll(query);

    expect(mockService.findByArtist).toHaveBeenCalledWith('a1', {
      period: 'upcoming',
      cursor: undefined,
      limit: undefined,
    });
    expect(result).toEqual({ data: [], nextCursor: null });
  });

  it('should call findAll when no artistId provided', async () => {
    mockService.findAll.mockResolvedValue([]);

    const result = await controller.findAll({});

    expect(mockService.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should pass cursor and limit for past pagination', async () => {
    mockService.findByArtist.mockResolvedValue({ data: [], nextCursor: null });

    await controller.findAll({
      artistId: 'a1',
      period: 'past' as const,
      cursor: 'c1',
      limit: 5,
    });

    expect(mockService.findByArtist).toHaveBeenCalledWith('a1', {
      period: 'past',
      cursor: 'c1',
      limit: 5,
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/server && npx jest src/schedule/schedule.controller.spec.ts --verbose`
Expected: FAIL — `findAll` signature doesn't match

- [ ] **Step 3: 컨트롤러 수정**

`apps/server/src/schedule/schedule.controller.ts`에서 `findAll`을 수정:

```typescript
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

// findAll 메서드를 다음으로 교체:
@Get()
findAll(@Query() query: FindSchedulesQueryDto) {
  if (query.artistId) {
    return this.scheduleService.findByArtist(query.artistId, {
      period: query.period,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
  return this.scheduleService.findAll();
}
```

기존 `@Query('artistId') artistId?: string` import는 제거. `FindSchedulesQueryDto` import 추가.

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd apps/server && npx jest src/schedule/schedule.controller.spec.ts --verbose`
Expected: PASS

- [ ] **Step 5: 전체 서버 테스트 실행**

Run: `cd apps/server && npx jest --verbose`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/schedule/schedule.controller.ts apps/server/src/schedule/schedule.controller.spec.ts apps/server/src/schedule/dto/find-schedules-query.dto.ts
git commit -m "feat(schedule): apply FindSchedulesQueryDto to controller"
```

---

### Task 4: 공유 타입에 PaginatedResponse 추가

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: PaginatedResponse 인터페이스 추가**

`packages/shared/src/index.ts` 파일 끝에 추가:

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): add PaginatedResponse interface"
```

---

## Chunk 2: 모바일 클라이언트

### Task 5: API 클라이언트 확장

**Files:**
- Modify: `apps/mobile/src/api/client.ts`

- [ ] **Step 1: artists와 schedules period API 메서드 추가**

`apps/mobile/src/api/client.ts`에 추가:

```typescript
// api 객체에 artists 프로퍼티 추가:
artists: {
  getOne(id: string) {
    return request<ArtistDetail>(`/artists/${id}`);
  },
},

// schedules 객체에 getByArtist 메서드 추가:
getByArtist(artistId: string, options: { period: 'upcoming' | 'past'; cursor?: string; limit?: number }) {
  const params = new URLSearchParams({ artistId, period: options.period });
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  return request<PaginatedScheduleResponse>(`/schedules?${params}`);
},
```

Response 타입도 추가:

```typescript
export interface ArtistDetail {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedScheduleResponse {
  data: CalendarSchedule[];
  nextCursor: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/api/client.ts
git commit -m "feat(mobile): add artists and paginated schedules API methods"
```

---

### Task 6: 아티스트 상세 화면 구현

**Files:**
- Modify: `apps/mobile/app/artists/[id].tsx`

- [ ] **Step 1: 화면 컴포넌트 구현**

`apps/mobile/app/artists/[id].tsx`를 전체 교체:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import { api, type ArtistDetail, type CalendarSchedule, type PaginatedScheduleResponse } from '../../src/api/client';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [upcoming, setUpcoming] = useState<CalendarSchedule[]>([]);
  const [past, setPast] = useState<CalendarSchedule[]>([]);
  const [pastCursor, setPastCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descNeedsToggle, setDescNeedsToggle] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [artistData, upcomingData, pastData] = await Promise.all([
        api.artists.getOne(id),
        api.schedules.getByArtist(id, { period: 'upcoming' }),
        api.schedules.getByArtist(id, { period: 'past', limit: 10 }),
      ]);
      setArtist(artistData);
      setUpcoming(upcomingData.data);
      setPast(pastData.data);
      setPastCursor(pastData.nextCursor);
    } catch {
      setError('아티스트 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadMorePast = async () => {
    if (!id || !pastCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.schedules.getByArtist(id, {
        period: 'past',
        cursor: pastCursor,
        limit: 10,
      });
      setPast((prev) => [...prev, ...res.data]);
      setPastCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Stack.Screen options={{ title: '' }} />
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !artist) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3">
        <Stack.Screen options={{ title: '' }} />
        <Text color="$colorSecondary" fontSize="$body">
          {error ?? '아티스트를 찾을 수 없습니다.'}
        </Text>
        <Pressable onPress={load}>
          <Text color="$accentColor" fontSize="$body" fontWeight="600">재시도</Text>
        </Pressable>
      </YStack>
    );
  }

  const socialEntries = artist.socialLinks ? Object.entries(artist.socialLinks) : [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <Stack.Screen options={{ title: artist.name }} />
      <ScrollView>
        {/* Compact Header */}
        <XStack padding="$4" gap="$4" alignItems="flex-start">
          <YStack
            width={72}
            height={72}
            borderRadius="$md"
            backgroundColor="$backgroundElevated"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {artist.imageUrl ? (
              <YStack width={72} height={72}>
                {/* Image placeholder — use expo-image when available */}
                <Text fontSize="$title" textAlign="center" lineHeight={72}>🎵</Text>
              </YStack>
            ) : (
              <Text fontSize={28}>🎵</Text>
            )}
          </YStack>
          <YStack flex={1} gap="$1">
            <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
              {artist.name}
            </Text>
            {artist.genre && (
              <Text fontSize="$caption" color="$colorSecondary">{artist.genre}</Text>
            )}
            {socialEntries.length > 0 && (
              <XStack gap="$2" marginTop="$1" flexWrap="wrap">
                {socialEntries.map(([name, url]) => (
                  <Pressable key={name} onPress={() => Linking.openURL(url)}>
                    <YStack
                      backgroundColor="$backgroundElevated"
                      borderRadius="$sm"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                    >
                      <Text fontSize="$caption" color="$accentColor" fontWeight="600">
                        {name}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            )}
          </YStack>
        </XStack>

        {/* Description */}
        {artist.description && (
          <YStack paddingHorizontal="$4" paddingBottom="$4">
            <Text
              fontSize="$body"
              color="$colorSecondary"
              numberOfLines={descExpanded ? undefined : 3}
              onTextLayout={(e: { nativeEvent: { lines: unknown[] } }) => {
                if (!descNeedsToggle && e.nativeEvent.lines.length > 3) {
                  setDescNeedsToggle(true);
                }
              }}
            >
              {artist.description}
            </Text>
            {descNeedsToggle && (
              <Pressable onPress={() => setDescExpanded((v) => !v)}>
                <Text fontSize="$caption" color="$accentColor" marginTop="$1">
                  {descExpanded ? '접기' : '더 보기'}
                </Text>
              </Pressable>
            )}
          </YStack>
        )}

        {/* Divider */}
        <YStack height={8} backgroundColor="$backgroundElevated" />

        {/* Upcoming Schedules */}
        {upcoming.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorSecondary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              다가오는 일정
            </Text>
            {upcoming.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                variant="upcoming"
                onPress={() => router.push(`/schedules/${schedule.id}`)}
              />
            ))}
          </YStack>
        )}

        {/* Separator */}
        {upcoming.length > 0 && past.length > 0 && (
          <YStack height={1} backgroundColor="$backgroundNested" marginHorizontal="$4" />
        )}

        {/* Past Schedules */}
        {past.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorTertiary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              지난 일정
            </Text>
            {past.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                variant="past"
                onPress={() => router.push(`/schedules/${schedule.id}`)}
              />
            ))}
            {pastCursor && (
              <Pressable onPress={loadMorePast} disabled={loadingMore}>
                <YStack alignItems="center" padding="$2">
                  {loadingMore ? (
                    <Spinner size="small" color="$colorTertiary" />
                  ) : (
                    <Text fontSize="$caption" color="$colorTertiary">더 보기 ↓</Text>
                  )}
                </YStack>
              </Pressable>
            )}
          </YStack>
        )}

        {/* Empty state */}
        {upcoming.length === 0 && past.length === 0 && (
          <YStack padding="$6" alignItems="center">
            <Text color="$colorSecondary" fontSize="$body">
              아직 등록된 일정이 없습니다
            </Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

// --- Schedule Card Component ---

function ScheduleCard({
  schedule,
  variant,
  onPress,
}: {
  schedule: CalendarSchedule;
  variant: 'upcoming' | 'past';
  onPress: () => void;
}) {
  const isPast = variant === 'past';
  const date = new Date(schedule.startDate);
  const formatted = formatScheduleDate(date);

  return (
    <Pressable onPress={onPress}>
      <XStack
        backgroundColor="$backgroundElevated"
        borderRadius="$md"
        padding="$3"
        justifyContent="space-between"
        alignItems="flex-start"
        opacity={isPast ? 0.6 : 1}
      >
        <YStack flex={1} gap="$1">
          <Text
            fontSize="$caption"
            fontWeight="600"
            color={isPast ? '$colorTertiary' : '$accentColor'}
          >
            {formatted}
          </Text>
          <Text
            fontSize="$body"
            fontWeight="600"
            color={isPast ? '$colorSecondary' : '$color'}
          >
            {schedule.title}
          </Text>
          {schedule.location && (
            <Text fontSize="$caption" color={isPast ? '$colorTertiary' : '$colorSecondary'}>
              {schedule.location}
            </Text>
          )}
        </YStack>
        <YStack
          backgroundColor="$backgroundNested"
          borderRadius="$sm"
          paddingHorizontal="$2"
          paddingVertical="$1"
        >
          <Text fontSize="$caption" color="$colorTertiary">{schedule.type}</Text>
        </YStack>
      </XStack>
    </Pressable>
  );
}

function formatScheduleDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/artists/[id].tsx
git commit -m "feat(mobile): implement artist detail screen with schedule sections"
```

---

### Task 7: 수동 검증

- [ ] **Step 1: 서버 실행 확인**

Run: `cd apps/server && npm run start:dev`
Expected: 서버가 정상 기동

- [ ] **Step 2: API 테스트**

```bash
# 아티스트 목록 조회 (ID 확인용)
curl http://localhost:3000/artists | jq '.[0].id'

# 기존 호환성 — period 없이 호출
curl "http://localhost:3000/schedules?artistId=<ARTIST_ID>" | jq 'length'

# upcoming 조회
curl "http://localhost:3000/schedules?artistId=<ARTIST_ID>&period=upcoming" | jq '.data | length'

# past 조회 (페이지네이션)
curl "http://localhost:3000/schedules?artistId=<ARTIST_ID>&period=past&limit=2" | jq '.nextCursor'
```

- [ ] **Step 3: 모바일 앱 실행 및 화면 확인**

Run: `cd apps/mobile && npx expo start`
Expected: 아티스트 상세 화면에서 헤더, 소개글, 일정 섹션이 올바르게 표시됨
