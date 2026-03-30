# Festival Artist Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-artist management for festivals (lineup mode + timetable mode) and concerts (main/guest) to the admin panel.

**Architecture:** Extend existing `PerformanceArtist` junction table with `stage` and `performanceScheduleId` fields. Add `LineupMode` enum and `lineupMode` field to `Performance`. Add Spotify search API endpoint. Build reusable artist search component and mode-specific editor components in admin.

**Tech Stack:** Prisma 7 (migration), NestJS 11 (DTO/service), Next.js 16 + React (admin UI), Spotify Web API

**Spec:** `docs/superpowers/specs/2026-03-30-festival-artist-management-design.md`

---

## File Structure

### Server (apps/server)

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `LineupMode` enum, `lineupMode` to Performance, `stage` + `performanceScheduleId` to PerformanceArtist |
| `src/performance/dto/create-performance.dto.ts` | Modify | Add `LineupMode` enum + `lineupMode` field |
| `src/performance/dto/replace-artists.dto.ts` | Modify | Add `stage` + `performanceScheduleId` fields |
| `src/performance/performance.service.ts` | Modify | Update `create`, `update`, `replaceArtists` to handle new fields |

### Admin (apps/admin)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/spotify/search/route.ts` | Create | Spotify artist name search endpoint |
| `src/lib/api.ts` | Modify | Add `spotify.search` + update `replaceArtists` signature |
| `src/app/performances/components/artist-search-input.tsx` | Create | Search input with DB + Spotify dropdown |
| `src/app/performances/components/lineup-editor.tsx` | Create | Day-based lineup editor with drag reorder |
| `src/app/performances/components/timetable-editor.tsx` | Create | Timetable editor with stage tabs + unassigned pool |
| `src/app/performances/components/assign-popover.tsx` | Create | Stage + time assignment popover |
| `src/app/performances/components/festival-artist-section.tsx` | Create | Mode toggle + editor switching |
| `src/app/performances/components/concert-artist-section.tsx` | Create | Simple artist list for non-festival |
| `src/app/performances/components/artist-section.tsx` | Create | Top-level wrapper: festival vs concert branching |
| `src/app/performances/components/performance-form.tsx` | Modify | Integrate artist section |
| `src/app/performances/[id]/page.tsx` | Modify | Add lineup/timetable read views |

### Shared (packages/shared)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/index.ts` | Modify | Add `LineupMode` enum, update `Performance` + `PerformanceArtistItem` types |

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add LineupMode enum and update models**

In `apps/server/prisma/schema.prisma`, add the `LineupMode` enum after `TicketPlatform` (after line 83):

```prisma
enum LineupMode {
  LINEUP
  TIMETABLE
}
```

Add `lineupMode` to the `Performance` model (after line 139, the `status` field):

```prisma
  lineupMode   LineupMode?          @map("lineup_mode")
```

Add `stage` and `performanceScheduleId` to `PerformanceArtist`, and a relation to `PerformanceSchedule`. Replace lines 185-202 with:

```prisma
model PerformanceArtist {
  id                    String               @id @default(uuid())
  performanceId         String               @map("performance_id")
  performance           Performance          @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  artistId              String               @map("artist_id")
  artist                Artist               @relation(fields: [artistId], references: [id], onDelete: Cascade)
  performanceScheduleId String?              @map("performance_schedule_id")
  performanceSchedule   PerformanceSchedule? @relation(fields: [performanceScheduleId], references: [id], onDelete: SetNull)
  role                  String?
  stageName             String?              @map("stage_name")
  stage                 String?
  startTime             DateTime?            @map("start_time")
  endTime               DateTime?            @map("end_time")
  performanceOrder      Int?                 @map("performance_order")
  createdAt             DateTime             @default(now()) @map("created_at")
  updatedAt             DateTime             @updatedAt @map("updated_at")
  bookmarks             UserBookmark[]

  @@unique([performanceId, artistId])
  @@map("performance_artists")
}
```

Add the reverse relation to `PerformanceSchedule`. Replace lines 173-183 with:

```prisma
model PerformanceSchedule {
  id            String              @id @default(uuid())
  performanceId String              @map("performance_id")
  performance   Performance         @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  dateTime      DateTime            @map("date_time")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")
  artists       PerformanceArtist[]

  @@unique([performanceId, dateTime])
  @@map("performance_schedules")
}
```

- [ ] **Step 2: Generate migration and Prisma client**

Run:
```bash
cd apps/server && npx prisma migrate dev --name add-festival-lineup-fields
```

Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add LineupMode enum, lineupMode, stage, performanceScheduleId to schema"
```

---

## Task 2: Shared Types Update

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add LineupMode enum**

In `packages/shared/src/index.ts`, add after `TicketPlatform` enum (after line 24):

```typescript
export enum LineupMode {
  LINEUP = 'LINEUP',
  TIMETABLE = 'TIMETABLE',
}
```

- [ ] **Step 2: Update Performance interface**

Add `lineupMode` field to the `Performance` interface (after the `status` field on line 82):

```typescript
  lineupMode: LineupMode | null;
```

- [ ] **Step 3: Update PerformanceArtistItem interface**

Add `performanceScheduleId` and `stage` to `PerformanceArtistItem`. Replace lines 110-119 with:

```typescript
export interface PerformanceArtistItem {
  id: string;
  artistId: string;
  artist?: Artist;
  performanceScheduleId: string | null;
  role: string | null;
  stageName: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number | null;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add LineupMode enum and update shared types"
```

---

## Task 3: Backend DTO Updates

**Files:**
- Modify: `apps/server/src/performance/dto/create-performance.dto.ts`
- Modify: `apps/server/src/performance/dto/replace-artists.dto.ts`

- [ ] **Step 1: Add LineupMode to CreatePerformanceDto**

In `apps/server/src/performance/dto/create-performance.dto.ts`, add `LineupMode` enum after `TicketPlatform` (after line 38):

```typescript
enum LineupMode {
  LINEUP = 'LINEUP',
  TIMETABLE = 'TIMETABLE',
}
```

Add `lineupMode` field to `CreatePerformanceDto` (after the `organizer` field, around line 93):

```typescript
  @ApiProperty({ enum: LineupMode, enumName: 'LineupMode' })
  @IsEnum(LineupMode)
  @IsOptional()
  lineupMode?: LineupMode;
```

- [ ] **Step 2: Add stage and performanceScheduleId to ArtistEntryDto**

In `apps/server/src/performance/dto/replace-artists.dto.ts`, add after the `performanceOrder` field (after line 26):

```typescript
  @IsString()
  @IsOptional()
  stage?: string;

  @IsUUID()
  @IsOptional()
  performanceScheduleId?: string;
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/performance/dto/
git commit -m "feat: add lineupMode, stage, performanceScheduleId to DTOs"
```

---

## Task 4: Backend Service Updates

**Files:**
- Modify: `apps/server/src/performance/performance.service.ts`

- [ ] **Step 1: Update create method**

In `performance.service.ts`, add `lineupMode` to the `performance.create` data block. In the `create` method around line 78, add after the `organizer` line (line 89):

```typescript
          lineupMode: dto.lineupMode ?? null,
```

- [ ] **Step 2: Update update method**

In the `update` method around line 180, add `lineupMode` to the `performance.update` data block, after the `organizer` line:

```typescript
          lineupMode: dto.lineupMode,
```

- [ ] **Step 3: Update replaceArtists method**

Replace the `replaceArtists` method (lines 361-385) to handle `stage` and `performanceScheduleId`:

```typescript
  async replaceArtists(
    performanceId: string,
    artists: { artistId: string; role?: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number; stage?: string; performanceScheduleId?: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.performanceArtist.deleteMany({ where: { performanceId } });
      if (artists.length > 0) {
        await tx.performanceArtist.createMany({
          data: artists.map((a) => ({
            performanceId,
            artistId: a.artistId,
            role: a.role ?? null,
            stageName: a.stageName ?? null,
            startTime: a.startTime ? new Date(a.startTime) : null,
            endTime: a.endTime ? new Date(a.endTime) : null,
            performanceOrder: a.performanceOrder ?? null,
            stage: a.stage ?? null,
            performanceScheduleId: a.performanceScheduleId ?? null,
          })),
        });
      }
      return tx.performance.findUniqueOrThrow({
        where: { id: performanceId },
        include: PERFORMANCE_INCLUDE,
      });
    });
  }
```

- [ ] **Step 4: Verify server compiles**

Run:
```bash
cd apps/server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/performance/
git commit -m "feat: handle lineupMode, stage, performanceScheduleId in service"
```

---

## Task 5: Spotify Search API Endpoint

**Files:**
- Create: `apps/admin/src/app/api/spotify/search/route.ts`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: Create Spotify search route**

Create `apps/admin/src/app/api/spotify/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify API 키가 설정되지 않았습니다.');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify 인증 실패: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

interface SpotifySearchArtist {
  id: string;
  name: string;
  images: { url: string }[];
  followers: { total: number };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(q)}&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Spotify API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const artists = (data.artists?.items ?? []).map((a: SpotifySearchArtist) => ({
      spotifyId: a.id,
      name: a.name,
      imageUrl: a.images[0]?.url ?? null,
      followers: a.followers?.total ?? 0,
    }));

    return NextResponse.json({ artists });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Add spotify.search and update replaceArtists in api.ts**

In `apps/admin/src/lib/api.ts`, add `search` to the `spotify` object (after line 80, before the closing brace of `spotify`):

```typescript
    search: async (query: string) => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Spotify search failed: ${res.status}`);
      }
      return res.json() as Promise<{
        artists: { spotifyId: string; name: string; imageUrl: string | null; followers: number }[];
      }>;
    },
```

Update the `replaceArtists` signature (line 132) to include new fields:

```typescript
    replaceArtists: (id: string, artists: { artistId: string; role?: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number; stage?: string; performanceScheduleId?: string }[]) =>
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/api/spotify/search/ apps/admin/src/lib/api.ts
git commit -m "feat: add Spotify search endpoint and update API client"
```

---

## Task 6: ArtistSearchInput Component

**Files:**
- Create: `apps/admin/src/app/performances/components/artist-search-input.tsx`

- [ ] **Step 1: Create the component**

Create `apps/admin/src/app/performances/components/artist-search-input.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';

interface ArtistSearchInputProps {
  onSelect: (artist: Artist) => void;
  excludeIds?: string[];
}

export function ArtistSearchInput({ onSelect, excludeIds = [] }: ArtistSearchInputProps) {
  const [query, setQuery] = useState('');
  const [dbResults, setDbResults] = useState<Artist[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<{ spotifyId: string; name: string; imageUrl: string | null; followers: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setDbResults([]);
      setSpotifyResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [db, spotify] = await Promise.all([
          api.artists.list(query),
          api.spotify.search(query),
        ]);
        setDbResults(db.filter((a) => !excludeIds.includes(a.id)));
        setSpotifyResults(spotify.artists);
        setOpen(true);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, excludeIds]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectDb(artist: Artist) {
    onSelect(artist);
    setQuery('');
    setOpen(false);
  }

  async function handleSelectSpotify(item: { spotifyId: string; name: string; imageUrl: string | null; followers: number }) {
    setCreating(item.spotifyId);
    try {
      const detail = await api.spotify.getArtist(item.spotifyId);
      const artist = await api.artists.create({
        name: detail.name,
        description: detail.description,
        imageUrl: detail.imageUrl,
        socialLinks: { spotify: detail.spotifyUrl },
        spotifyId: detail.spotifyId,
        spotifyUrl: detail.spotifyUrl,
        monthlyListeners: detail.monthlyListeners,
        spotifyMeta: detail.spotifyMeta,
      });
      onSelect(artist);
      setQuery('');
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Spotify 아티스트 등록 실패');
    } finally {
      setCreating(null);
    }
  }

  const hasResults = dbResults.length > 0 || spotifyResults.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hasResults && setOpen(true)}
        placeholder="아티스트 이름으로 검색..."
        className="form-input w-full"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted-foreground)' }}>
          검색중...
        </div>
      )}

      {open && hasResults && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          border: '1px solid var(--border)', background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 320, overflowY: 'auto',
        }}>
          {dbResults.length > 0 && (
            <>
              <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                DB 검색 결과
              </div>
              {dbResults.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectDb(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--secondary)', cursor: 'pointer',
                  }}
                >
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    {a.spotifyId && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Spotify 연결됨</div>}
                  </div>
                </button>
              ))}
            </>
          )}

          {spotifyResults.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 11, color: 'var(--muted-foreground)',
                borderBottom: '1px solid var(--border)', background: 'var(--secondary)',
              }}>
                Spotify 검색 결과
              </div>
              {spotifyResults.map((a) => (
                <button
                  key={a.spotifyId}
                  type="button"
                  onClick={() => handleSelectSpotify(a)}
                  disabled={creating === a.spotifyId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--secondary)', cursor: 'pointer',
                  }}
                >
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#1DB954' }}>
                      Spotify · {a.followers.toLocaleString()} followers
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, padding: '2px 8px', border: '1px solid #1DB954', color: '#1DB954',
                  }}>
                    {creating === a.spotifyId ? '등록중...' : '+ 등록'}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/performances/components/artist-search-input.tsx
git commit -m "feat: add ArtistSearchInput component with DB + Spotify search"
```

---

## Task 7: LineupEditor Component

**Files:**
- Create: `apps/admin/src/app/performances/components/lineup-editor.tsx`

- [ ] **Step 1: Create the component**

Create `apps/admin/src/app/performances/components/lineup-editor.tsx`:

```typescript
'use client';

import { ArtistSearchInput } from './artist-search-input';
import type { Artist, PerformanceScheduleItem, PerformanceArtistItem } from '@ipchun/shared';

interface LineupArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  performanceOrder: number;
}

interface LineupEditorProps {
  schedules: PerformanceScheduleItem[];
  artists: LineupArtist[];
  onChange: (artists: LineupArtist[]) => void;
}

function formatDay(iso: string, index: number) {
  const d = new Date(iso);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = dayNames[d.getDay()];
  return `Day ${index + 1} · ${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${dow})`;
}

export function LineupEditor({ schedules, artists, onChange }: LineupEditorProps) {
  const excludeIds = artists.map((a) => a.artistId);

  // Group by unique dates (yyyy-mm-dd)
  const uniqueDays = schedules.reduce<PerformanceScheduleItem[]>((acc, s) => {
    const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
    if (!acc.find((x) => new Date(x.dateTime).toISOString().slice(0, 10) === dateKey)) {
      acc.push(s);
    }
    return acc;
  }, []);

  function getArtistsForDay(scheduleId: string) {
    return artists
      .filter((a) => a.performanceScheduleId === scheduleId)
      .sort((a, b) => a.performanceOrder - b.performanceOrder);
  }

  function handleAdd(scheduleId: string, artist: Artist) {
    const dayArtists = getArtistsForDay(scheduleId);
    const maxOrder = dayArtists.length > 0 ? Math.max(...dayArtists.map((a) => a.performanceOrder)) : 0;
    onChange([
      ...artists,
      { artistId: artist.id, artist, performanceScheduleId: scheduleId, performanceOrder: maxOrder + 1 },
    ]);
  }

  function handleRemove(artistId: string) {
    onChange(artists.filter((a) => a.artistId !== artistId));
  }

  function handleMoveUp(scheduleId: string, artistId: string) {
    const dayArtists = getArtistsForDay(scheduleId);
    const idx = dayArtists.findIndex((a) => a.artistId === artistId);
    if (idx <= 0) return;

    const updated = artists.map((a) => {
      if (a.artistId === dayArtists[idx].artistId) return { ...a, performanceOrder: dayArtists[idx - 1].performanceOrder };
      if (a.artistId === dayArtists[idx - 1].artistId) return { ...a, performanceOrder: dayArtists[idx].performanceOrder };
      return a;
    });
    onChange(updated);
  }

  function handleMoveDown(scheduleId: string, artistId: string) {
    const dayArtists = getArtistsForDay(scheduleId);
    const idx = dayArtists.findIndex((a) => a.artistId === artistId);
    if (idx < 0 || idx >= dayArtists.length - 1) return;

    const updated = artists.map((a) => {
      if (a.artistId === dayArtists[idx].artistId) return { ...a, performanceOrder: dayArtists[idx + 1].performanceOrder };
      if (a.artistId === dayArtists[idx + 1].artistId) return { ...a, performanceOrder: dayArtists[idx].performanceOrder };
      return a;
    });
    onChange(updated);
  }

  return (
    <div>
      {uniqueDays.map((schedule, dayIdx) => {
        const dayArtists = getArtistsForDay(schedule.id);
        return (
          <div key={schedule.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {formatDay(schedule.dateTime, dayIdx)}
            </div>

            {dayArtists.map((a, i) => (
              <div
                key={a.artistId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                  border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => handleMoveUp(schedule.id, a.artistId)} disabled={i === 0}
                    style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: i === 0 ? 'var(--border)' : 'var(--foreground)' }}>▲</button>
                  <button type="button" onClick={() => handleMoveDown(schedule.id, a.artistId)} disabled={i === dayArtists.length - 1}
                    style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: i === dayArtists.length - 1 ? 'var(--border)' : 'var(--foreground)' }}>▼</button>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--muted-foreground)', width: 20, textAlign: 'center', fontSize: 13 }}>{i + 1}</div>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
                <button type="button" onClick={() => handleRemove(a.artistId)}
                  style={{ fontSize: 12, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <ArtistSearchInput onSelect={(artist) => handleAdd(schedule.id, artist)} excludeIds={excludeIds} />
            </div>
          </div>
        );
      })}

      {uniqueDays.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          회차(일정)를 먼저 등록하면 Day가 자동으로 생성됩니다.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/performances/components/lineup-editor.tsx
git commit -m "feat: add LineupEditor component with day-based ordering"
```

---

## Task 8: AssignPopover Component

**Files:**
- Create: `apps/admin/src/app/performances/components/assign-popover.tsx`

- [ ] **Step 1: Create the component**

Create `apps/admin/src/app/performances/components/assign-popover.tsx`:

```typescript
'use client';

import { useState } from 'react';
import type { Artist } from '@ipchun/shared';

interface ScheduleOption {
  id: string;
  label: string;
}

interface AssignPopoverProps {
  artist: Artist;
  stages: string[];
  scheduleOptions: ScheduleOption[];
  onAssign: (scheduleId: string, stage: string, startTime: string, endTime: string) => void;
  onCancel: () => void;
}

export function AssignPopover({ artist, stages, scheduleOptions, onAssign, onCancel }: AssignPopoverProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState(scheduleOptions[0]?.id ?? '');
  const [selectedStage, setSelectedStage] = useState(stages[0] ?? '');
  const [newStage, setNewStage] = useState('');
  const [isNewStage, setIsNewStage] = useState(stages.length === 0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const activeStage = isNewStage ? newStage : selectedStage;

  function handleSubmit() {
    if (!selectedScheduleId || !activeStage.trim() || !startTime || !endTime) return;
    onAssign(selectedScheduleId, activeStage.trim(), startTime, endTime);
  }

  return (
    <div style={{
      border: '1px solid var(--border)', background: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: 16, maxWidth: 320,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {artist.imageUrl && (
          <img src={artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div style={{ fontSize: 14, fontWeight: 600 }}>{artist.name}</div>
      </div>

      {scheduleOptions.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Day</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {scheduleOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedScheduleId(s.id)}
                style={{
                  padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                  border: selectedScheduleId === s.id ? '2px solid var(--foreground)' : '1px solid var(--border)',
                  background: selectedScheduleId === s.id ? 'var(--foreground)' : 'transparent',
                  color: selectedScheduleId === s.id ? '#fff' : 'var(--foreground)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>스테이지</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSelectedStage(s); setIsNewStage(false); }}
              style={{
                padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                border: !isNewStage && selectedStage === s ? '2px solid var(--foreground)' : '1px solid var(--border)',
                background: !isNewStage && selectedStage === s ? 'var(--foreground)' : 'transparent',
                color: !isNewStage && selectedStage === s ? '#fff' : 'var(--foreground)',
              }}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsNewStage(true)}
            style={{
              padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              border: isNewStage ? '2px solid var(--foreground)' : '1px dashed var(--border)',
              background: isNewStage ? 'var(--foreground)' : 'transparent',
              color: isNewStage ? '#fff' : 'var(--muted-foreground)',
            }}
          >
            + 새 스테이지
          </button>
        </div>
        {isNewStage && (
          <input
            type="text"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            placeholder="스테이지 이름 입력"
            className="form-input w-full"
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>시작</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-input w-full" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>종료</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-input w-full" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleSubmit}
          disabled={!activeStage.trim() || !startTime || !endTime}
          className="btn-primary" style={{ flex: 1 }}>배정</button>
        <button type="button" onClick={onCancel}
          className="btn-secondary">취소</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/performances/components/assign-popover.tsx
git commit -m "feat: add AssignPopover component for timetable stage+time assignment"
```

---

## Task 9: TimetableEditor Component

**Files:**
- Create: `apps/admin/src/app/performances/components/timetable-editor.tsx`

- [ ] **Step 1: Create the component**

Create `apps/admin/src/app/performances/components/timetable-editor.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ArtistSearchInput } from './artist-search-input';
import { AssignPopover } from './assign-popover';
import type { Artist, PerformanceScheduleItem } from '@ipchun/shared';

export interface TimetableArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface TimetableEditorProps {
  schedules: PerformanceScheduleItem[];
  artists: TimetableArtist[];
  onChange: (artists: TimetableArtist[]) => void;
}

function formatDay(iso: string, index: number) {
  const d = new Date(iso);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = dayNames[d.getDay()];
  return `Day ${index + 1} · ${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${dow})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimetableEditor({ schedules, artists, onChange }: TimetableEditorProps) {
  const [assigningArtistId, setAssigningArtistId] = useState<string | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<Record<string, string>>({});

  const excludeIds = artists.map((a) => a.artistId);

  // Unique days
  const uniqueDays = schedules.reduce<PerformanceScheduleItem[]>((acc, s) => {
    const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
    if (!acc.find((x) => new Date(x.dateTime).toISOString().slice(0, 10) === dateKey)) {
      acc.push(s);
    }
    return acc;
  }, []);

  // All stages derived from artists
  const allStages = [...new Set(artists.map((a) => a.stage).filter(Boolean))] as string[];

  function getAssignedForDayAndStage(scheduleId: string, stage: string) {
    return artists
      .filter((a) => a.performanceScheduleId === scheduleId && a.stage === stage && a.startTime)
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
  }

  // Unassigned = no stage or no startTime
  const unassigned = artists.filter((a) => !a.stage || !a.startTime);

  function handleAdd(artist: Artist) {
    onChange([
      ...artists,
      { artistId: artist.id, artist, performanceScheduleId: null, stage: null, startTime: null, endTime: null },
    ]);
  }

  function handleAssign(artistId: string, scheduleId: string, stage: string, startTime: string, endTime: string) {
    const scheduleDate = new Date(schedules.find((s) => s.id === scheduleId)!.dateTime);
    const dateStr = scheduleDate.toISOString().slice(0, 10);

    const updated = artists.map((a) => {
      if (a.artistId !== artistId) return a;
      return {
        ...a,
        performanceScheduleId: scheduleId,
        stage,
        startTime: `${dateStr}T${startTime}:00`,
        endTime: `${dateStr}T${endTime}:00`,
      };
    });
    onChange(updated);
    setAssigningArtistId(null);
  }

  function handleUnassign(artistId: string) {
    const updated = artists.map((a) => {
      if (a.artistId !== artistId) return a;
      return { ...a, performanceScheduleId: null, stage: null, startTime: null, endTime: null };
    });
    onChange(updated);
  }

  function handleRemove(artistId: string) {
    onChange(artists.filter((a) => a.artistId !== artistId));
  }

  return (
    <div>
      {uniqueDays.map((schedule, dayIdx) => {
        const dayStages = allStages.filter((stage) =>
          artists.some((a) => a.performanceScheduleId === schedule.id && a.stage === stage),
        );
        const currentStage = activeStageTab[schedule.id] ?? dayStages[0] ?? '';

        return (
          <div key={schedule.id} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {formatDay(schedule.dateTime, dayIdx)}
            </div>

            {/* Stage tabs */}
            {dayStages.length > 0 && (
              <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
                {dayStages.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setActiveStageTab({ ...activeStageTab, [schedule.id]: stage })}
                    style={{
                      padding: '8px 16px', fontSize: 12, fontWeight: currentStage === stage ? 600 : 400,
                      border: '1px solid',
                      borderColor: currentStage === stage ? 'var(--foreground)' : 'var(--border)',
                      background: currentStage === stage ? 'var(--foreground)' : 'transparent',
                      color: currentStage === stage ? '#fff' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                    }}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            )}

            {/* Assigned artists for current stage */}
            {currentStage && getAssignedForDayAndStage(schedule.id, currentStage).map((a) => (
              <div key={a.artistId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, minWidth: 90, fontFamily: 'monospace' }}>
                  {formatTime(a.startTime!)} – {formatTime(a.endTime!)}
                </div>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
                <button type="button" onClick={() => handleUnassign(a.artistId)}
                  style={{ fontSize: 11, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>해제</button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Unassigned pool */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>
            미배정 아티스트 ({unassigned.length})
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {unassigned.map((a) => (
            <div key={a.artistId} style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                border: '1px solid var(--border)', background: 'var(--secondary)',
              }}>
                {a.artist.imageUrl && (
                  <img src={a.artist.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a.artist.name}</span>
                {uniqueDays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssigningArtistId(assigningArtistId === a.artistId ? null : a.artistId)}
                    style={{ fontSize: 11, padding: '2px 8px', background: 'var(--accent)', border: 'none', cursor: 'pointer' }}
                  >
                    배정
                  </button>
                )}
                <button type="button" onClick={() => handleRemove(a.artistId)}
                  style={{ fontSize: 11, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>

              {assigningArtistId === a.artistId && uniqueDays.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4 }}>
                  <AssignPopover
                    artist={a.artist}
                    stages={allStages}
                    scheduleOptions={uniqueDays.map((s, i) => ({ id: s.id, label: `Day ${i + 1}` }))}
                    onAssign={(scheduleId, stage, startTime, endTime) => handleAssign(a.artistId, scheduleId, stage, startTime, endTime)}
                    onCancel={() => setAssigningArtistId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <ArtistSearchInput onSelect={handleAdd} excludeIds={excludeIds} />
      </div>

      {uniqueDays.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>
          회차(일정)를 먼저 등록하면 Day가 자동으로 생성됩니다.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/performances/components/timetable-editor.tsx
git commit -m "feat: add TimetableEditor with stage tabs and unassigned pool"
```

---

## Task 10: FestivalArtistSection and ConcertArtistSection

**Files:**
- Create: `apps/admin/src/app/performances/components/festival-artist-section.tsx`
- Create: `apps/admin/src/app/performances/components/concert-artist-section.tsx`
- Create: `apps/admin/src/app/performances/components/artist-section.tsx`

- [ ] **Step 1: Create FestivalArtistSection**

Create `apps/admin/src/app/performances/components/festival-artist-section.tsx`:

```typescript
'use client';

import { LineupEditor } from './lineup-editor';
import { TimetableEditor } from './timetable-editor';
import type { Artist, PerformanceScheduleItem, LineupMode } from '@ipchun/shared';

interface FestivalArtist {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  performanceOrder: number;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface FestivalArtistSectionProps {
  lineupMode: LineupMode;
  onLineupModeChange: (mode: LineupMode) => void;
  schedules: PerformanceScheduleItem[];
  artists: FestivalArtist[];
  onArtistsChange: (artists: FestivalArtist[]) => void;
}

export function FestivalArtistSection({
  lineupMode,
  onLineupModeChange,
  schedules,
  artists,
  onArtistsChange,
}: FestivalArtistSectionProps) {
  return (
    <div>
      {/* Mode toggle */}
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--muted-foreground)' }}>
        라인업 형식
      </label>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => onLineupModeChange('LINEUP' as LineupMode)}
          style={{
            flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer',
            border: '2px solid',
            borderColor: lineupMode === 'LINEUP' ? 'var(--foreground)' : 'var(--border)',
            background: lineupMode === 'LINEUP' ? 'var(--foreground)' : 'var(--background)',
            color: lineupMode === 'LINEUP' ? '#fff' : 'var(--foreground)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>라인업</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>일자별 출연 아티스트 순서만</div>
        </button>
        <button
          type="button"
          onClick={() => onLineupModeChange('TIMETABLE' as LineupMode)}
          style={{
            flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer',
            border: '2px solid',
            borderColor: lineupMode === 'TIMETABLE' ? 'var(--foreground)' : 'var(--border)',
            background: lineupMode === 'TIMETABLE' ? 'var(--foreground)' : 'var(--background)',
            color: lineupMode === 'TIMETABLE' ? '#fff' : 'var(--foreground)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>타임테이블</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>시간대 + 스테이지별 배치</div>
        </button>
      </div>

      {/* Editor based on mode */}
      {lineupMode === 'LINEUP' ? (
        <LineupEditor
          schedules={schedules}
          artists={artists.map((a) => ({
            artistId: a.artistId,
            artist: a.artist,
            performanceScheduleId: a.performanceScheduleId,
            performanceOrder: a.performanceOrder,
          }))}
          onChange={(lineupArtists) => {
            onArtistsChange(lineupArtists.map((a) => ({
              ...a,
              stage: null,
              startTime: null,
              endTime: null,
            })));
          }}
        />
      ) : (
        <TimetableEditor
          schedules={schedules}
          artists={artists.map((a) => ({
            artistId: a.artistId,
            artist: a.artist,
            performanceScheduleId: a.performanceScheduleId,
            stage: a.stage,
            startTime: a.startTime,
            endTime: a.endTime,
          }))}
          onChange={(timetableArtists) => {
            onArtistsChange(timetableArtists.map((a) => ({
              ...a,
              performanceOrder: 0,
            })));
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ConcertArtistSection**

Create `apps/admin/src/app/performances/components/concert-artist-section.tsx`:

```typescript
'use client';

import { ArtistSearchInput } from './artist-search-input';
import type { Artist } from '@ipchun/shared';

interface ConcertArtist {
  artistId: string;
  artist: Artist;
  role: string | null;
}

interface ConcertArtistSectionProps {
  artists: ConcertArtist[];
  onArtistsChange: (artists: ConcertArtist[]) => void;
}

export function ConcertArtistSection({ artists, onArtistsChange }: ConcertArtistSectionProps) {
  const excludeIds = artists.map((a) => a.artistId);

  function handleAdd(artist: Artist) {
    onArtistsChange([...artists, { artistId: artist.id, artist, role: null }]);
  }

  function handleRemove(artistId: string) {
    onArtistsChange(artists.filter((a) => a.artistId !== artistId));
  }

  function handleRoleChange(artistId: string, role: string) {
    onArtistsChange(artists.map((a) => a.artistId === artistId ? { ...a, role: role || null } : a));
  }

  return (
    <div>
      {artists.map((a) => (
        <div key={a.artistId} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 10,
          border: '1px solid var(--border)', marginBottom: 6, background: '#fff',
        }}>
          {a.artist.imageUrl && (
            <img src={a.artist.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.artist.name}</div>
          <select
            value={a.role ?? ''}
            onChange={(e) => handleRoleChange(a.artistId, e.target.value)}
            className="form-input"
            style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
          >
            <option value="">역할 없음</option>
            <option value="메인">메인</option>
            <option value="게스트">게스트</option>
          </select>
          <button type="button" onClick={() => handleRemove(a.artistId)}
            style={{ fontSize: 12, color: 'var(--destructive)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <ArtistSearchInput onSelect={handleAdd} excludeIds={excludeIds} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ArtistSection wrapper**

Create `apps/admin/src/app/performances/components/artist-section.tsx`:

```typescript
'use client';

import { FestivalArtistSection } from './festival-artist-section';
import { ConcertArtistSection } from './concert-artist-section';
import type { Artist, PerformanceScheduleItem, LineupMode } from '@ipchun/shared';

interface ArtistEntry {
  artistId: string;
  artist: Artist;
  performanceScheduleId: string | null;
  role: string | null;
  stage: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number;
}

interface ArtistSectionProps {
  genre: string;
  lineupMode: LineupMode | null;
  onLineupModeChange: (mode: LineupMode) => void;
  schedules: PerformanceScheduleItem[];
  artists: ArtistEntry[];
  onArtistsChange: (artists: ArtistEntry[]) => void;
}

export type { ArtistEntry };

export function ArtistSection({
  genre,
  lineupMode,
  onLineupModeChange,
  schedules,
  artists,
  onArtistsChange,
}: ArtistSectionProps) {
  const isFestival = genre === 'FESTIVAL';

  return (
    <div>
      <h3 className="form-label" style={{ fontSize: 14, marginBottom: 12 }}>
        {isFestival ? '페스티벌 아티스트' : '아티스트'}
      </h3>

      {isFestival ? (
        <FestivalArtistSection
          lineupMode={lineupMode ?? ('LINEUP' as LineupMode)}
          onLineupModeChange={onLineupModeChange}
          schedules={schedules}
          artists={artists}
          onArtistsChange={onArtistsChange}
        />
      ) : (
        <ConcertArtistSection
          artists={artists.map((a) => ({ artistId: a.artistId, artist: a.artist, role: a.role }))}
          onArtistsChange={(concertArtists) => {
            onArtistsChange(concertArtists.map((a) => ({
              ...a,
              performanceScheduleId: null,
              stage: null,
              startTime: null,
              endTime: null,
              performanceOrder: 0,
            })));
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/performances/components/festival-artist-section.tsx apps/admin/src/app/performances/components/concert-artist-section.tsx apps/admin/src/app/performances/components/artist-section.tsx
git commit -m "feat: add FestivalArtistSection, ConcertArtistSection, and ArtistSection wrapper"
```

---

## Task 11: Integrate ArtistSection into Performance Form

**Files:**
- Modify: `apps/admin/src/app/performances/components/performance-form.tsx`

- [ ] **Step 1: Add artist state and import**

At the top of `performance-form.tsx`, add the import (after existing imports):

```typescript
import { ArtistSection } from './artist-section';
import type { ArtistEntry } from './artist-section';
import type { LineupMode, PerformanceScheduleItem } from '@ipchun/shared';
```

Add artist state variables to the component (after existing state declarations, around line 97):

```typescript
  const [lineupMode, setLineupMode] = useState<LineupMode | null>(
    initialData?.lineupMode ?? null,
  );
  const [artistEntries, setArtistEntries] = useState<ArtistEntry[]>(
    (initialData?.artists ?? []).map((a) => ({
      artistId: a.artistId,
      artist: a.artist!,
      performanceScheduleId: a.performanceScheduleId ?? null,
      role: a.role,
      stage: a.stage ?? null,
      startTime: a.startTime,
      endTime: a.endTime,
      performanceOrder: a.performanceOrder ?? 0,
    })),
  );
```

- [ ] **Step 2: Include lineupMode in handleSubmit**

In the `handleSubmit` function, add `lineupMode` to the data object (around line 155, in the body being passed to `onSubmit`). Add after the `organizer` field:

```typescript
      lineupMode: genre === 'FESTIVAL' ? lineupMode : null,
```

- [ ] **Step 3: Save artists after performance creation/update**

After `onSubmit` is called in `handleSubmit`, add artist saving logic. After the `await onSubmit(data)` call, add:

```typescript
      // Save artists if any
      if (artistEntries.length > 0 || (initialData?.artists ?? []).length > 0) {
        // Get the performance ID from the response or initialData
        const perfId = initialData?.id;
        if (perfId) {
          await api.performances.replaceArtists(
            perfId,
            artistEntries.map((a) => ({
              artistId: a.artistId,
              role: a.role ?? undefined,
              stage: a.stage ?? undefined,
              startTime: a.startTime ?? undefined,
              endTime: a.endTime ?? undefined,
              performanceOrder: a.performanceOrder ?? undefined,
              performanceScheduleId: a.performanceScheduleId ?? undefined,
            })),
          );
        }
      }
```

Note: For new performances (create mode), artists will be saved separately after the performance is created. The `onSubmit` callback in `new/page.tsx` should return the created performance so the ID is available. Alternatively, artists can be managed from the detail/edit page after initial creation.

- [ ] **Step 4: Add ArtistSection to the form JSX**

Add the `ArtistSection` component in the form's JSX, after the tickets section (around line 389) and before the submit button:

```typescript
        {/* 아티스트 */}
        <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <ArtistSection
            genre={genre}
            lineupMode={lineupMode}
            onLineupModeChange={setLineupMode}
            schedules={schedules.filter((s) => s.dateTime).map((s, i) => ({
              id: (initialData?.schedules?.[i]?.id) ?? `temp-${i}`,
              dateTime: s.dateTime,
            }))}
            artists={artistEntries}
            onArtistsChange={setArtistEntries}
          />
        </div>
```

- [ ] **Step 5: Verify the admin app compiles**

Run:
```bash
cd apps/admin && npx next build 2>&1 | head -30
```

Expected: Build succeeds or only non-related warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/app/performances/components/performance-form.tsx
git commit -m "feat: integrate ArtistSection into performance form"
```

---

## Task 12: Update Performance Detail Page

**Files:**
- Modify: `apps/admin/src/app/performances/[id]/page.tsx`

- [ ] **Step 1: Replace the existing artist lineup section**

In `apps/admin/src/app/performances/[id]/page.tsx`, replace lines 160-173 (the existing artist section) with a richer read view:

```typescript
        {/* 아티스트 라인업 */}
        {performance.artists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-primary)' }}>
                {performance.lineupMode === 'TIMETABLE' ? '타임테이블' : performance.lineupMode === 'LINEUP' ? '라인업' : '아티스트 라인업'}
              </h2>
              <Link href={`/performances/${id}/edit`} style={{ fontSize: 12, color: 'var(--foreground)', border: '1px solid var(--border)', padding: '4px 12px' }}>
                편집
              </Link>
            </div>

            {performance.lineupMode === 'TIMETABLE' ? (
              // Timetable read view
              (() => {
                const scheduleMap = new Map(performance.schedules.map((s) => [s.id, s]));
                const dayGroups = performance.schedules.reduce<Record<string, typeof performance.artists>>((acc, s) => {
                  const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
                  if (!acc[dateKey]) acc[dateKey] = [];
                  const dayArtists = performance.artists.filter((a) => a.performanceScheduleId === s.id);
                  acc[dateKey].push(...dayArtists);
                  return acc;
                }, {});

                return Object.entries(dayGroups).map(([dateKey, dayArtists], dayIdx) => {
                  const stageGroups = dayArtists.reduce<Record<string, typeof dayArtists>>((acc, a) => {
                    const stage = a.stage ?? '미배정';
                    if (!acc[stage]) acc[stage] = [];
                    acc[stage].push(a);
                    return acc;
                  }, {});

                  const d = new Date(dateKey);
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

                  return (
                    <div key={dateKey} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                        Day {dayIdx + 1} · {dateKey} ({dayNames[d.getDay()]})
                      </div>
                      {Object.entries(stageGroups).map(([stage, stageArtists]) => (
                        <div key={stage} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{stage}</div>
                          <div style={{ borderLeft: '2px solid var(--foreground)', paddingLeft: 12 }}>
                            {stageArtists
                              .sort((a, b) => (a.startTime && b.startTime ? new Date(a.startTime).getTime() - new Date(b.startTime).getTime() : 0))
                              .map((a) => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                  {a.startTime && a.endTime && (
                                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-foreground)', minWidth: 80 }}>
                                      {formatDateTime(a.startTime).slice(-5)}–{formatDateTime(a.endTime).slice(-5)}
                                    </span>
                                  )}
                                  <span className="font-medium text-sm">{a.artist?.name ?? 'Unknown'}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()
            ) : performance.lineupMode === 'LINEUP' ? (
              // Lineup read view
              (() => {
                const dayGroups = performance.schedules.reduce<Record<string, typeof performance.artists>>((acc, s) => {
                  const dateKey = new Date(s.dateTime).toISOString().slice(0, 10);
                  if (!acc[dateKey]) acc[dateKey] = [];
                  const dayArtists = performance.artists
                    .filter((a) => a.performanceScheduleId === s.id)
                    .sort((a, b) => (a.performanceOrder ?? 0) - (b.performanceOrder ?? 0));
                  acc[dateKey].push(...dayArtists);
                  return acc;
                }, {});

                return Object.entries(dayGroups).map(([dateKey, dayArtists], dayIdx) => {
                  const d = new Date(dateKey);
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

                  return (
                    <div key={dateKey} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                        Day {dayIdx + 1} · {dateKey} ({dayNames[d.getDay()]})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {dayArtists.map((a) => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="font-medium text-sm">{a.artist?.name ?? 'Unknown'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              // Default: simple list (non-festival)
              <div className="space-y-2">
                {performance.artists.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{a.artist?.name ?? a.stageName ?? 'Unknown'}</span>
                    {a.role && <span style={{ color: 'var(--muted-foreground)' }}>({a.role})</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/performances/[id]/page.tsx
git commit -m "feat: add lineup/timetable read views to performance detail page"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Verify server compiles**

```bash
cd apps/server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify admin compiles**

```bash
cd apps/admin && npx next build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 3: Run existing tests if any**

```bash
cd apps/server && npm test 2>&1 | tail -20
```

Expected: All existing tests pass.

- [ ] **Step 4: Manual smoke test**

1. Start dev servers: `pnpm dev`
2. Go to `/performances/new`
3. Set genre to "페스티벌" → verify mode toggle appears
4. Add schedules → verify Day sections appear in artist editor
5. Search for an artist → verify DB + Spotify dropdown
6. Select a Spotify artist → verify it creates in DB and appears in the list
7. Switch between Lineup and Timetable modes → verify UI changes
8. In Timetable mode: add artist → verify it appears in unassigned pool → click "배정" → verify popover → assign → verify it appears in timetable
9. Save the performance → go to detail page → verify read view

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
