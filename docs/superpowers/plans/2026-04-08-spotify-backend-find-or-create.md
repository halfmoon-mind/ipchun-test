# Spotify 백엔드 통합 + Artist find-or-create 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spotify API를 NestJS 백엔드로 이전하고, `POST /artists/find-or-create` 엔드포인트로 아티스트를 DB 검색 → Spotify 매칭 → 자동 생성한다.

**Architecture:** 새 `SpotifyModule`이 Spotify API 통신을 담당하고, `ArtistService`에서 주입하여 find-or-create 로직을 구현. Admin의 Spotify route는 삭제하고 백엔드 엔드포인트로 대체.

**Tech Stack:** NestJS 11, Prisma 7, Spotify Web API (Client Credentials), TypeScript 5

**Spec:** `docs/superpowers/specs/2026-04-08-spotify-backend-find-or-create-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/server/src/spotify/spotify.types.ts` | Create | Spotify API 응답 타입 + 서비스 반환 타입 |
| `apps/server/src/spotify/spotify.service.ts` | Create | 토큰 관리, search, getArtist |
| `apps/server/src/spotify/spotify.module.ts` | Create | SpotifyService export |
| `apps/server/src/artist/dto/find-or-create-artist.dto.ts` | Create | name 필드만 가진 DTO |
| `apps/server/src/artist/artist.service.ts` | Modify | findOrCreate 메서드 추가 |
| `apps/server/src/artist/artist.controller.ts` | Modify | 엔드포인트 3개 추가 |
| `apps/server/src/artist/artist.module.ts` | Modify | SpotifyModule import |
| `apps/server/src/app.module.ts` | Modify | SpotifyModule 등록 |
| `apps/admin/src/app/api/spotify/route.ts` | Delete | 백엔드로 이전 |
| `apps/admin/src/app/api/spotify/search/route.ts` | Delete | 백엔드로 이전 |
| `apps/admin/src/lib/api.ts` | Modify | Spotify 호출을 백엔드로 변경 |
| `apps/admin/src/app/performances/components/artist-suggestions.tsx` | Modify | 백엔드 엔드포인트 사용 |
| `.claude/skills/register-performance/SKILL.md` | Modify | 아티스트 섹션 수정 |
| `.claude/skills/register-performance/references/api-cheatsheet.md` | Modify | 엔드포인트 추가 |

---

### Task 1: Spotify 타입 정의

**Files:**
- Create: `apps/server/src/spotify/spotify.types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// apps/server/src/spotify/spotify.types.ts

// --- Spotify Web API raw response types ---

export interface SpotifyApiArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

export interface SpotifyApiTrack {
  name: string;
  popularity: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
}

// --- Service return types ---

export interface SpotifySearchResult {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  followers: number;
}

export interface SpotifyArtistDetail {
  name: string;
  imageUrl: string | null;
  description: string | null;
  spotifyId: string;
  spotifyUrl: string;
  monthlyListeners: number | null;
  spotifyMeta: {
    genres: string[];
    popularity: number;
    followers: number;
    images: { url: string; width: number; height: number }[];
    topTracks: {
      name: string;
      previewUrl: string | null;
      popularity: number;
      albumName: string;
      albumImageUrl: string | null;
    }[];
    relatedArtists: {
      name: string;
      spotifyId: string;
      imageUrl: string | null;
      genres: string[];
    }[];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/spotify/spotify.types.ts
git commit -m "feat(server): add Spotify API type definitions"
```

---

### Task 2: SpotifyService 구현

**Files:**
- Create: `apps/server/src/spotify/spotify.service.ts`

- [ ] **Step 1: Create SpotifyService with token management, search, and getArtist**

```typescript
// apps/server/src/spotify/spotify.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  SpotifyApiArtist,
  SpotifyApiTrack,
  SpotifySearchResult,
  SpotifyArtistDetail,
} from './spotify.types';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getToken(): Promise<string | null> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured');
      return null;
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
      this.logger.error(`Spotify auth failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  private async spotifyApi<T>(token: string, path: string): Promise<T | null> {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  async search(query: string): Promise<SpotifySearchResult[]> {
    const token = await this.getToken();
    if (!token) return [];

    try {
      const res = await fetch(
        `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return [];

      const data = await res.json();
      return (data.artists?.items ?? []).map((a: SpotifyApiArtist) => ({
        spotifyId: a.id,
        name: a.name,
        imageUrl: a.images[0]?.url ?? null,
        followers: a.followers?.total ?? 0,
      }));
    } catch (err) {
      this.logger.error(`Spotify search failed: ${err}`);
      return [];
    }
  }

  async getArtist(spotifyId: string): Promise<SpotifyArtistDetail | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const [artist, topTracksRes, relatedRes, html] = await Promise.all([
        this.spotifyApi<SpotifyApiArtist>(token, `/artists/${spotifyId}`),
        this.spotifyApi<{ tracks: SpotifyApiTrack[] }>(
          token,
          `/artists/${spotifyId}/top-tracks?market=KR`,
        ),
        this.spotifyApi<{ artists: SpotifyApiArtist[] }>(
          token,
          `/artists/${spotifyId}/related-artists`,
        ),
        fetch(`https://open.spotify.com/artist/${spotifyId}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          },
        })
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => ''),
      ]);

      if (!artist) return null;

      const monthlyListeners = this.parseMonthlyListeners(html);
      const description = this.parseDescription(html);

      return {
        name: artist.name,
        imageUrl: artist.images[0]?.url ?? null,
        description,
        spotifyId,
        spotifyUrl: `https://open.spotify.com/artist/${spotifyId}`,
        monthlyListeners,
        spotifyMeta: {
          genres: artist.genres ?? [],
          popularity: artist.popularity ?? 0,
          followers: artist.followers?.total ?? 0,
          images: (artist.images ?? []).map((img) => ({
            url: img.url,
            width: img.width,
            height: img.height,
          })),
          topTracks: (topTracksRes?.tracks ?? []).slice(0, 5).map((t) => ({
            name: t.name,
            previewUrl: t.preview_url,
            popularity: t.popularity,
            albumName: t.album.name,
            albumImageUrl: t.album.images[0]?.url ?? null,
          })),
          relatedArtists: (relatedRes?.artists ?? []).slice(0, 5).map((a) => ({
            name: a.name,
            spotifyId: a.id,
            imageUrl: a.images[0]?.url ?? null,
            genres: a.genres,
          })),
        },
      };
    } catch (err) {
      this.logger.error(`Spotify getArtist failed: ${err}`);
      return null;
    }
  }

  private parseMonthlyListeners(html: string): number | null {
    const match = html.match(
      /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/,
    );
    if (!match) return null;

    const numMatch = match[1].match(/([\d,.]+)(K|M)?\s*monthly listeners/i);
    if (!numMatch) return null;

    let num = parseFloat(numMatch[1].replace(/,/g, ''));
    if (numMatch[2]?.toUpperCase() === 'K') num *= 1_000;
    if (numMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
    return Math.round(num);
  }

  private parseDescription(html: string): string | null {
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (!jsonLdMatch) return null;

    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const raw: string | undefined = jsonLd.description;
      if (!raw) return null;

      const lower = raw.toLowerCase();
      if (
        /monthly listeners?/i.test(lower) ||
        /where people listen/i.test(lower) ||
        /^artist\s*·/i.test(raw.trim()) ||
        /·\s*song:/i.test(raw)
      ) {
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd apps/server && npx tsc --noEmit`
Expected: No errors related to spotify files.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/spotify/spotify.service.ts
git commit -m "feat(server): implement SpotifyService with token management and API methods"
```

---

### Task 3: SpotifyModule 생성

**Files:**
- Create: `apps/server/src/spotify/spotify.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: Create SpotifyModule**

```typescript
// apps/server/src/spotify/spotify.module.ts
import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';

@Module({
  providers: [SpotifyService],
  exports: [SpotifyService],
})
export class SpotifyModule {}
```

- [ ] **Step 2: Register in AppModule**

In `apps/server/src/app.module.ts`, add the import:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { PerformanceModule } from './performance/performance.module';
import { SpotifyModule } from './spotify/spotify.module';

@Module({
  imports: [PrismaModule, SpotifyModule, ArtistModule, AttendanceModule, BookmarkModule, PerformanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/spotify/spotify.module.ts apps/server/src/app.module.ts
git commit -m "feat(server): create SpotifyModule and register in AppModule"
```

---

### Task 4: find-or-create DTO + ArtistService 메서드

**Files:**
- Create: `apps/server/src/artist/dto/find-or-create-artist.dto.ts`
- Modify: `apps/server/src/artist/artist.service.ts`
- Modify: `apps/server/src/artist/artist.module.ts`

- [ ] **Step 1: Create FindOrCreateArtistDto**

```typescript
// apps/server/src/artist/dto/find-or-create-artist.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class FindOrCreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

- [ ] **Step 2: Import SpotifyModule in ArtistModule**

Replace the contents of `apps/server/src/artist/artist.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ArtistController } from './artist.controller';
import { ArtistService } from './artist.service';
import { SpotifyModule } from '../spotify/spotify.module';

@Module({
  imports: [SpotifyModule],
  controllers: [ArtistController],
  providers: [ArtistService],
  exports: [ArtistService],
})
export class ArtistModule {}
```

- [ ] **Step 3: Add findOrCreate to ArtistService**

In `apps/server/src/artist/artist.service.ts`, inject SpotifyService and add the method. The full updated file:

```typescript
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyService } from '../spotify/spotify.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spotify: SpotifyService,
  ) {}

  async create(dto: CreateArtistDto) {
    if (dto.spotifyId) {
      const existing = await this.prisma.artist.findUnique({
        where: { spotifyId: dto.spotifyId },
      });
      if (existing) {
        throw new ConflictException({
          message: `이미 등록된 Spotify 아티스트입니다: ${existing.name}`,
          existingArtist: existing,
        });
      }
    }
    return this.prisma.artist.create({ data: dto });
  }

  async findOrCreate(name: string) {
    // 1. DB exact match (case-insensitive)
    const dbResults = await this.prisma.artist.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (dbResults.length > 0) {
      return { artist: dbResults[0], created: false };
    }

    // 2. Spotify search
    const spotifyResults = await this.spotify.search(name);
    if (spotifyResults.length > 0) {
      const nameLower = name.trim().toLowerCase();

      // Exact name match first, then highest followers
      const exactMatch = spotifyResults.find(
        (r) => r.name.trim().toLowerCase() === nameLower,
      );
      const best = exactMatch ?? spotifyResults[0];

      // Check if this spotifyId already exists in DB
      const existingBySpotify = await this.prisma.artist.findUnique({
        where: { spotifyId: best.spotifyId },
      });
      if (existingBySpotify) {
        return { artist: existingBySpotify, created: false };
      }

      // Fetch full detail
      const detail = await this.spotify.getArtist(best.spotifyId);
      if (detail) {
        const artist = await this.prisma.artist.create({
          data: {
            name: detail.name,
            imageUrl: detail.imageUrl,
            description: detail.description,
            spotifyId: detail.spotifyId,
            spotifyUrl: detail.spotifyUrl,
            monthlyListeners: detail.monthlyListeners,
            spotifyMeta: detail.spotifyMeta as Record<string, unknown>,
            socialLinks: { spotify: detail.spotifyUrl },
          },
        });
        this.logger.log(`Artist created with Spotify data: ${artist.name} (${artist.spotifyId})`);
        return { artist, created: true };
      }
    }

    // 3. Fallback: create with name only
    const artist = await this.prisma.artist.create({
      data: { name },
    });
    this.logger.log(`Artist created without Spotify: ${artist.name}`);
    return { artist, created: true };
  }

  findAll(search?: string) {
    return this.prisma.artist.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.artist.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateArtistDto) {
    return this.prisma.artist.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.artist.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd apps/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/artist/dto/find-or-create-artist.dto.ts apps/server/src/artist/artist.module.ts apps/server/src/artist/artist.service.ts
git commit -m "feat(server): add findOrCreate method with Spotify auto-matching"
```

---

### Task 5: Controller 엔드포인트 추가

**Files:**
- Modify: `apps/server/src/artist/artist.controller.ts`

- [ ] **Step 1: Add three new endpoints**

Replace the full file:

```typescript
// apps/server/src/artist/artist.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ArtistService } from './artist.service';
import { SpotifyService } from '../spotify/spotify.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { FindOrCreateArtistDto } from './dto/find-or-create-artist.dto';

@ApiTags('Artists')
@Controller('artists')
export class ArtistController {
  constructor(
    private readonly artistService: ArtistService,
    private readonly spotify: SpotifyService,
  ) {}

  @Post('find-or-create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DB 검색 → Spotify 매칭 → 아티스트 자동 생성' })
  async findOrCreate(@Body() dto: FindOrCreateArtistDto, @Res() res: Response) {
    const { artist, created } = await this.artistService.findOrCreate(dto.name);
    return res.status(created ? HttpStatus.CREATED : HttpStatus.OK).json(artist);
  }

  @Get('spotify/search')
  @ApiOperation({ summary: 'Spotify 아티스트 검색' })
  @ApiQuery({ name: 'q', required: true, description: '검색어' })
  async spotifySearch(@Query('q') q: string) {
    const artists = await this.spotify.search(q);
    return { artists };
  }

  @Get('spotify/:spotifyId')
  @ApiOperation({ summary: 'Spotify 아티스트 상세 조회' })
  async spotifyDetail(@Param('spotifyId') spotifyId: string) {
    return this.spotify.getArtist(spotifyId);
  }

  @Post()
  @ApiOperation({ summary: '아티스트 생성' })
  create(@Body() dto: CreateArtistDto) {
    return this.artistService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '아티스트 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '아티스트 이름 검색' })
  findAll(@Query('search') search?: string) {
    return this.artistService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: '아티스트 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.artistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '아티스트 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '아티스트 삭제' })
  remove(@Param('id') id: string) {
    return this.artistService.remove(id);
  }
}
```

**Important:** `find-or-create`, `spotify/search`, `spotify/:spotifyId` 라우트는 `:id` 라우트보다 **위에** 선언. NestJS는 선언 순서대로 매칭하므로, `:id`가 위에 있으면 "find-or-create"를 id로 해석함.

- [ ] **Step 2: Verify compilation and server starts**

Run: `cd apps/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/artist/artist.controller.ts
git commit -m "feat(server): add find-or-create and Spotify proxy endpoints to ArtistController"
```

---

### Task 6: 환경변수 설정

**Files:**
- Modify: `apps/server/.env`

- [ ] **Step 1: Add Spotify credentials to server .env**

Admin의 `.env`에서 `SPOTIFY_CLIENT_ID`와 `SPOTIFY_CLIENT_SECRET` 값을 복사하여 서버 `.env`에 추가:

```bash
# apps/server/.env 에 아래 2줄 추가
SPOTIFY_CLIENT_ID=<admin .env에 있는 값>
SPOTIFY_CLIENT_SECRET=<admin .env에 있는 값>
```

- [ ] **Step 2: Verify server starts with Spotify configured**

Run: `cd apps/server && pnpm start:dev`

서버 로그에 Spotify 관련 경고가 없는지 확인.

- [ ] **Step 3: Manual API test**

```bash
# find-or-create 테스트
curl -X POST http://localhost:3000/artists/find-or-create \
  -H "Content-Type: application/json" \
  -d '{"name": "IU"}'

# Spotify 검색 테스트
curl "http://localhost:3000/artists/spotify/search?q=IU"
```

Expected: find-or-create는 IU 아티스트를 Spotify 데이터와 함께 반환 (201). Spotify 검색은 `{ artists: [...] }` 반환.

---

### Task 7: Admin Spotify route 삭제 + api.ts 수정

**Files:**
- Delete: `apps/admin/src/app/api/spotify/route.ts`
- Delete: `apps/admin/src/app/api/spotify/search/route.ts`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: Delete admin Spotify routes**

```bash
rm apps/admin/src/app/api/spotify/route.ts
rm apps/admin/src/app/api/spotify/search/route.ts
rmdir apps/admin/src/app/api/spotify/search
rmdir apps/admin/src/app/api/spotify
```

- [ ] **Step 2: Update api.ts to call backend**

In `apps/admin/src/lib/api.ts`, replace the `spotify` section (lines 75-101):

Before:
```typescript
  spotify: {
    getArtist: async (spotifyId: string) => {
      const res = await fetch(`/api/spotify?id=${spotifyId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Spotify fetch failed: ${res.status}`);
      }
      return res.json() as Promise<{
        name: string;
        imageUrl: string | null;
        description: string | null;
        spotifyId: string;
        spotifyUrl: string;
        monthlyListeners: number | null;
        spotifyMeta: SpotifyMeta | null;
      }>;
    },
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
  },
```

After:
```typescript
  spotify: {
    getArtist: (spotifyId: string) =>
      request<{
        name: string;
        imageUrl: string | null;
        description: string | null;
        spotifyId: string;
        spotifyUrl: string;
        monthlyListeners: number | null;
        spotifyMeta: SpotifyMeta | null;
      }>(`/artists/spotify/${spotifyId}`),
    search: (query: string) =>
      request<{
        artists: { spotifyId: string; name: string; imageUrl: string | null; followers: number }[];
      }>(`/artists/spotify/search?q=${encodeURIComponent(query)}`),
  },
```

- [ ] **Step 3: Verify admin compiles**

Run: `cd apps/admin && npx next build`
Expected: Build succeeds. No references to deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A apps/admin/src/app/api/spotify/ apps/admin/src/lib/api.ts
git commit -m "refactor(admin): replace Spotify API routes with backend endpoints"
```

---

### Task 8: artist-suggestions.tsx 수정

**Files:**
- Modify: `apps/admin/src/app/performances/components/artist-suggestions.tsx`

- [ ] **Step 1: Update handleSelectSpotify to use backend endpoints**

The `handleSelectSpotify` function (lines 69-113) currently calls:
1. `api.spotify.getArtist(item.spotifyId)` — local Next.js route
2. `api.youtube.searchChannel(item.name)` — YouTube
3. `api.artists.create(...)` — manual creation with all fields

After the api.ts change in Task 7, `api.spotify.getArtist` already calls the backend. The only change needed is that `api.spotify.getArtist` now goes through the backend's `request()` helper which handles errors differently.

Verify the existing `handleSelectSpotify` works correctly with the new backend routing by checking for any type/behavior differences. The return types are identical so **no code change is needed in this file** — the api.ts update handles the routing transparently.

- [ ] **Step 2: Test in browser**

1. Start server: `cd apps/server && pnpm start:dev`
2. Start admin: `cd apps/admin && pnpm dev`
3. Navigate to performance create/edit page
4. Enter a performance URL with a known artist
5. Verify artist suggestions appear with Spotify results
6. Click a Spotify artist → verify it creates with full Spotify data

---

### Task 9: register-performance 스킬 수정

**Files:**
- Modify: `.claude/skills/register-performance/SKILL.md`
- Modify: `.claude/skills/register-performance/references/api-cheatsheet.md`

- [ ] **Step 1: Update SKILL.md artist section**

In `.claude/skills/register-performance/SKILL.md`, replace the "아티스트 검색/생성" section (the section starting with `## 아티스트 검색/생성`) with:

```markdown
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
```

- [ ] **Step 2: Remove "아티스트 생성 시 정보 보강" section**

`.claude/skills/register-performance/SKILL.md`에서 "### 아티스트 생성 시 정보 보강" 섹션을 삭제. 서버가 Spotify로 자동 보강하므로 스킬이 description을 채울 필요 없음.

- [ ] **Step 3: Update api-cheatsheet.md**

In `.claude/skills/register-performance/references/api-cheatsheet.md`, add to the Artist section:

```markdown
### Find or Create (Spotify 자동 매칭)
```bash
curl -X POST $BASE_URL/artists/find-or-create \
  -H "Content-Type: application/json" \
  -d '{"name": "아티스트이름"}'
```
- 200: 기존 아티스트 반환
- 201: 새로 생성 (Spotify 데이터 포함)
- 서버가 자동으로 DB 검색 → Spotify 매칭 → 생성

### Spotify Search (Admin UI용)
```bash
curl "$BASE_URL/artists/spotify/search?q=아티스트이름"
```
- Spotify 검색 결과 반환 (DB 저장 안 함)

### Spotify Detail (Admin UI용)
```bash
curl "$BASE_URL/artists/spotify/{spotifyId}"
```
- Spotify 아티스트 상세 정보 반환
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/register-performance/SKILL.md .claude/skills/register-performance/references/api-cheatsheet.md
git commit -m "docs(skill): update register-performance to use find-or-create endpoint"
```

---

### Task 10: End-to-end 검증

- [ ] **Step 1: Server test — find-or-create with known artist**

```bash
curl -X POST http://localhost:3000/artists/find-or-create \
  -H "Content-Type: application/json" \
  -d '{"name": "아이유"}'
```

Expected: 201 with Spotify data (spotifyId, imageUrl, spotifyMeta populated).

- [ ] **Step 2: Server test — find-or-create with existing artist (idempotent)**

```bash
curl -X POST http://localhost:3000/artists/find-or-create \
  -H "Content-Type: application/json" \
  -d '{"name": "아이유"}'
```

Expected: 200 with same artist (no duplicate created).

- [ ] **Step 3: Server test — find-or-create with unknown artist**

```bash
curl -X POST http://localhost:3000/artists/find-or-create \
  -H "Content-Type: application/json" \
  -d '{"name": "알수없는밴드12345"}'
```

Expected: 201 with name only (no Spotify data, spotifyId null).

- [ ] **Step 4: Admin test — performance artist suggestions**

1. Open admin in browser
2. Create/edit a performance
3. Verify Spotify artist suggestions still work (now via backend)

- [ ] **Step 5: Swagger docs check**

Open `http://localhost:3000/api-docs` and verify the three new endpoints appear under Artists tag.
