# Spotify Web API 기반 아티스트 자동 채우기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin에서 Spotify 링크만 입력하면 Spotify Web API를 통해 아티스트 정보(이름, 이미지, 장르, 인기 트랙, 관련 아티스트 등)를 자동 채우기.

**Architecture:** 기존 HTML 스크래핑(`/api/spotify/route.ts`)을 Spotify Web API client_credentials 인증으로 교체. 3개 API 엔드포인트 병렬 호출 + og:description 파싱으로 월간 리스너 수 추출. 추가 데이터는 Artist 테이블의 `spotifyMeta` JSON 컬럼과 `monthlyListeners` Int 컬럼에 저장.

**Tech Stack:** Next.js 16 API route, Spotify Web API (client_credentials), Prisma 7, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-29-spotify-web-api-integration-design.md`

---

## File Map

| 파일 | 작업 | 담당 Task |
|------|------|-----------|
| `apps/server/prisma/schema.prisma` | `monthlyListeners`, `spotifyMeta` 컬럼 추가 | Task 1 |
| `packages/shared/src/index.ts` | `SpotifyMeta` 인터페이스 추가, `Artist` 확장 | Task 2 |
| `apps/server/src/artist/dto/create-artist.dto.ts` | 2개 필드 추가 | Task 2 |
| `apps/admin/.env.example` | Spotify 키 placeholder 추가 | Task 3 |
| `apps/admin/src/app/api/spotify/route.ts` | Web API 기반으로 전면 교체 | Task 3 |
| `apps/admin/src/lib/api.ts` | spotify 응답 타입 확장 | Task 4 |
| `apps/admin/src/app/artists/new/page.tsx` | Spotify 추가 데이터 표시 + submit 확장 | Task 4 |
| `apps/admin/src/app/artists/[id]/edit/page.tsx` | 동일 | Task 5 |

---

### Task 1: Prisma 스키마 + 마이그레이션

**Files:**
- Modify: `apps/server/prisma/schema.prisma:10-23`

- [ ] **Step 1: Artist 모델에 2개 컬럼 추가**

`apps/server/prisma/schema.prisma`에서 Artist 모델을 수정:

```prisma
model Artist {
  id               String           @id @default(uuid())
  name             String
  description      String?
  imageUrl         String?          @map("image_url")
  socialLinks      Json?            @map("social_links")
  spotifyId        String?          @unique @map("spotify_id")
  spotifyUrl       String?          @map("spotify_url")
  monthlyListeners Int?             @map("monthly_listeners")
  spotifyMeta      Json?            @map("spotify_meta")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")
  lineups          ScheduleLineup[]

  @@map("artists")
}
```

- [ ] **Step 2: 마이그레이션 생성 및 적용**

Run: `cd apps/server && npx prisma migrate dev --name add_spotify_meta`

Expected: Migration created and applied. Two new columns `monthly_listeners` (integer, nullable) and `spotify_meta` (jsonb, nullable) added to `artists` table.

- [ ] **Step 3: Prisma client 재생성 확인**

Run: `cd apps/server && npx prisma generate`

Expected: Prisma Client generated successfully.

- [ ] **Step 4: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat(server): add monthlyListeners and spotifyMeta columns to Artist"
```

---

### Task 2: Shared 타입 + Server DTO 업데이트

**Files:**
- Modify: `packages/shared/src/index.ts:14-24`
- Modify: `apps/server/src/artist/dto/create-artist.dto.ts`

- [ ] **Step 1: SpotifyMeta 인터��이스 추가 및 Artist 확장**

`packages/shared/src/index.ts`에서 `Artist` 인터페이스 아래에 `SpotifyMeta`를 추가하고 `Artist`를 확장:

```typescript
export interface SpotifyMeta {
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
}

export interface Artist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  spotifyId: string | null;
  spotifyUrl: string | null;
  monthlyListeners: number | null;
  spotifyMeta: SpotifyMeta | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: CreateArtistDto에 2개 필드 추가**

`apps/server/src/artist/dto/create-artist.dto.ts`에 추가:

```typescript
import { IsString, IsOptional, IsObject, IsNotEmpty, IsInt } from 'class-validator';

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsString()
  @IsOptional()
  spotifyId?: string;

  @IsString()
  @IsOptional()
  spotifyUrl?: string;

  @IsInt()
  @IsOptional()
  monthlyListeners?: number;

  @IsObject()
  @IsOptional()
  spotifyMeta?: Record<string, unknown>;
}
```

`UpdateArtistDto`는 `PartialType(CreateArtistDto)`이므로 자동으로 포함됨.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts apps/server/src/artist/dto/create-artist.dto.ts
git commit -m "feat: add SpotifyMeta type and extend Artist with spotify fields"
```

---

### Task 3: Spotify API Route — Web API 기반으로 교체

**Files:**
- Modify: `apps/admin/.env.example`
- Modify: `apps/admin/src/app/api/spotify/route.ts` (전면 교체)

- [ ] **Step 1: .env.example에 Spotify 키 placeholder 추가**

`apps/admin/.env.example`에 추가:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
GEMINI_API_KEY=
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

사용자에게 안내: `apps/admin/.env.local`에도 실제 키를 넣어야 함.

- [ ] **Step 2: Spotify API route 전면 교체**

`apps/admin/src/app/api/spotify/route.ts`를 아래 ��용으로 교체:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// --- Spotify Token Cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set');
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
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // 1분 여유
  return cachedToken!;
}

// --- Spotify API Helpers ---
async function spotifyApi<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function parseMonthlyListeners(html: string): number | null {
  const match = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/,
  );
  if (!match) return null;

  const text = match[1]; // "Artist · 654.2K monthly listeners."
  const numMatch = text.match(/([\d,.]+)(K|M)?\s*monthly listeners/i);
  if (!numMatch) return null;

  let num = parseFloat(numMatch[1].replace(/,/g, ''));
  if (numMatch[2]?.toUpperCase() === 'K') num *= 1_000;
  if (numMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
  return Math.round(num);
}

// --- Spotify API Types ---
interface SpotifyArtist {
  name: string;
  id: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  name: string;
  popularity: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
}

// --- Route Handler ---
export async function GET(request: NextRequest) {
  const spotifyId = request.nextUrl.searchParams.get('id');
  if (!spotifyId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();

    // 4개 요청 병렬 실행
    const [artist, topTracksRes, relatedRes, htmlRes] = await Promise.all([
      spotifyApi<SpotifyArtist>(token, `/artists/${spotifyId}`),
      spotifyApi<{ tracks: SpotifyTrack[] }>(token, `/artists/${spotifyId}/top-tracks`),
      spotifyApi<{ artists: SpotifyArtist[] }>(token, `/artists/${spotifyId}/related-artists`),
      fetch(`https://open.spotify.com/artist/${spotifyId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      }).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
    ]);

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found on Spotify' },
        { status: 404 },
      );
    }

    // og:description에서 월간 리스너 파싱
    const monthlyListeners = parseMonthlyListeners(htmlRes);

    // JSON-LD에서 description 추출
    let description: string | null = null;
    const jsonLdMatch = htmlRes.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        description = jsonLd.description || null;
      } catch {}
    }

    const data = {
      name: artist.name,
      imageUrl: artist.images[0]?.url || null,
      description,
      spotifyId,
      spotifyUrl: `https://open.spotify.com/artist/${spotifyId}`,
      monthlyListeners,
      spotifyMeta: {
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers.total,
        images: artist.images.map((img) => ({
          url: img.url,
          width: img.width,
          height: img.height,
        })),
        topTracks: (topTracksRes?.tracks || []).map((t) => ({
          name: t.name,
          previewUrl: t.preview_url,
          popularity: t.popularity,
          albumName: t.album.name,
          albumImageUrl: t.album.images[0]?.url || null,
        })),
        relatedArtists: (relatedRes?.artists || []).map((a) => ({
          name: a.name,
          spotifyId: a.id,
          imageUrl: a.images[0]?.url || null,
          genres: a.genres,
        })),
      },
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: 수동 테스트**

서버 실행 후 브라우저에서 확인:

Run: `curl http://localhost:3001/api/spotify?id=57okaLdCtv3nVBSn5otJkp | python3 -m json.tool | head -30`

Expected: JSON 응답에 `name: "HYUKOH"`, `spotifyMeta.genres`, `spotifyMeta.topTracks`, `spotifyMeta.relatedArtists` 포��.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/.env.example apps/admin/src/app/api/spotify/route.ts
git commit -m "feat(admin): replace Spotify scraping with Web API integration"
```

---

### Task 4: Admin API 클라이언트 + 새 아티스트 페이지 UI

**Files:**
- Modify: `apps/admin/src/lib/api.ts:98-110`
- Modify: `apps/admin/src/app/artists/new/page.tsx`

- [ ] **Step 1: API 클라이언트 응답 타입 확장**

`apps/admin/src/lib/api.ts`에서 spotify 섹션의 반환 타입을 확장:

```typescript
spotify: {
  getArtist: async (spotifyId: string) => {
    const res = await fetch(`/api/spotify?id=${spotifyId}`);
    if (!res.ok) throw new Error(`Spotify fetch failed: ${res.status}`);
    return res.json() as Promise<{
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
      } | null;
    }>;
  },
},
```

- [ ] **Step 2: new/page.tsx에 state 추가 및 fetch 핸들러 확장**

`apps/admin/src/app/artists/new/page.tsx`에서:

기존 state 아래에 추가:

```typescript
const [monthlyListeners, setMonthlyListeners] = useState<number | null>(null);
const [spotifyMeta, setSpotifyMeta] = useState<{
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
} | null>(null);
```

`handleSpotifyFetch`의 try 블록에서 기존 `setName(data.name)` 등 아래에 추���:

```typescript
setMonthlyListeners(data.monthlyListeners);
setSpotifyMeta(data.spotifyMeta);
```

`handleSubmit`의 `api.artists.create` 호출에 필드 추가:

```typescript
await api.artists.create({
  name,
  description: description || null,
  imageUrl: imageUrl || null,
  socialLinks: Object.keys(socialLinksObj).length > 0 ? socialLinksObj : null,
  spotifyId: spotifyId || null,
  spotifyUrl: spotifyLink || null,
  monthlyListeners,
  spotifyMeta,
});
```

- [ ] **Step 3: Spotify 정보 섹션 UI 확장**

`apps/admin/src/app/artists/new/page.tsx`에서 기존 `{/* Spotify 정보 */}` 섹션을 아래로 교체:

```tsx
{/* Spotify 정보 */}
{spotifyId && (
  <div
    className="p-4 space-y-4"
    style={{ background: 'rgba(29, 185, 84, 0.05)', border: '1px solid rgba(29, 185, 84, 0.12)' }}
  >
    <p className="text-[13px] font-semibold" style={{ color: '#1DB954' }}>
      Spotify 정보
    </p>

    {/* 기본 정보 */}
    <div className="grid grid-cols-2 gap-3 text-[13px]">
      <div>
        <span style={{ color: 'var(--text-tertiary)' }}>Spotify ID</span>
        <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{spotifyId}</p>
      </div>
      <div>
        <span style={{ color: 'var(--text-tertiary)' }}>링크</span>
        <p className="mt-0.5">
          <a
            href={spotifyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
            style={{ color: '#1DB954' }}
          >
            Spotify에서 보기
          </a>
        </p>
      </div>
    </div>

    {/* 수치 정보 */}
    {spotifyMeta && (
      <>
        <div className="grid grid-cols-3 gap-3 text-[13px]">
          {monthlyListeners != null && (
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>월간 리스너</span>
              <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {monthlyListeners.toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>팔로워</span>
            <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {spotifyMeta.followers.toLocaleString()}
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>인기도</span>
            <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {spotifyMeta.popularity}/100
            </p>
          </div>
        </div>

        {/* 장르 */}
        {spotifyMeta.genres.length > 0 && (
          <div>
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>장르</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {spotifyMeta.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 text-[12px]"
                  style={{ background: 'rgba(29, 185, 84, 0.1)', color: '#1DB954' }}
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 인기 트랙 */}
        {spotifyMeta.topTracks.length > 0 && (
          <div>
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>인기 트랙</span>
            <div className="mt-1 space-y-1">
              {spotifyMeta.topTracks.slice(0, 5).map((track, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="w-5 text-right" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                  {track.albumImageUrl && (
                    <img src={track.albumImageUrl} alt="" className="w-6 h-6 object-cover" />
                  )}
                  <span style={{ color: 'var(--text-primary)' }}>{track.name}</span>
                  <span className="ml-auto text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    {track.albumName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 관��� 아티스트 */}
        {spotifyMeta.relatedArtists.length > 0 && (
          <div>
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>관련 아티스트</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {spotifyMeta.relatedArtists.slice(0, 8).map((ra) => (
                <div key={ra.spotifyId} className="flex items-center gap-1.5 text-[12px]">
                  {ra.imageUrl && (
                    <img src={ra.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  <span style={{ color: 'var(--text-primary)' }}>{ra.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/app/artists/new/page.tsx
git commit -m "feat(admin): show Spotify Web API data in new artist form"
```

---

### Task 5: Edit ���티스트 페이지 동일 적용

**Files:**
- Modify: `apps/admin/src/app/artists/[id]/edit/page.tsx`

- [ ] **Step 1: state 추가**

`apps/admin/src/app/artists/[id]/edit/page.tsx`에서:

기존 state 아래에 추가 (Task 4 Step 2와 동일한 타입):

```typescript
const [monthlyListeners, setMonthlyListeners] = useState<number | null>(null);
const [spotifyMeta, setSpotifyMeta] = useState<{
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
} | null>(null);
```

- [ ] **Step 2: useEffect에서 기존 데이터 로��**

`useEffect`의 `api.artists.get(id).then((artist) => { ... })` 블록 안에 추��:

```typescript
setMonthlyListeners(artist.monthlyListeners);
setSpotifyMeta(artist.spotifyMeta);
```

- [ ] **Step 3: handleSpotifyFetch의 try 블록에 추가**

기존 `setSocialLinks` 아래에:

```typescript
setMonthlyListeners(data.monthlyListeners);
setSpotifyMeta(data.spotifyMeta);
```

- [ ] **Step 4: handleSubmit의 api.artists.update 호출에 필드 추가**

```typescript
await api.artists.update(id, {
  name,
  description: description || null,
  imageUrl: imageUrl || null,
  socialLinks: Object.keys(socialLinksObj).length > 0 ? socialLinksObj : null,
  spotifyId: spotifyId || null,
  spotifyUrl: spotifyLink || null,
  monthlyListeners,
  spotifyMeta,
});
```

- [ ] **Step 5: Spotify 정보 섹션 UI 교체**

기존 `{/* Spotify 정보 */}` 섹션을 Task 4 Step 3의 JSX와 동일하게 교체.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/app/artists/[id]/edit/page.tsx
git commit -m "feat(admin): show Spotify Web API data in edit artist form"
```

---

### Task 6: 수동 E2E 검증

- [ ] **Step 1: 서버 + Admin 실행**

Run:
```bash
cd apps/server && pnpm dev &
cd apps/admin && pnpm dev &
```

- [ ] **Step 2: 새 아티스트 등록 테스트**

1. Admin `http://localhost:3001/artists/new` 접속
2. Spotify URL에 `https://open.spotify.com/artist/57okaLdCtv3nVBSn5otJkp` 입력
3. "자동 채우기" 클릭
4. 확인: 이름(HYUKOH), 이미지, 장르 배지, 월간 리스너/팔로워/인기도 수치, 인기 트랙 5곡, 관련 아티스트 표시
5. "등록" 클릭 → 아티스트 목록으로 이동, 정상 저장 확인

- [ ] **Step 3: 수정 페이지 테스트**

1. 등록한 아티스트의 수정 페이지 접속
2. 확인: 저장된 `spotifyMeta`, `monthlyListeners` 데이터가 UI에 표시됨
3. 수정 후 저장 → 데이터 유지 확인

- [ ] **Step 4: 에러 케이스 확인**

1. 존재하지 않는 Spotify ID 입력 → "Artist not found on Spotify" 에러 표시
2. API 키 없이 요청 → 에러 메시지 표시
