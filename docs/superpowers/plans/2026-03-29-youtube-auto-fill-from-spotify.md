# YouTube 자동 채우기 (Spotify 연동) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spotify URL로 아티스트 등록 시 YouTube Data API v3를 통해 해당 아티스트의 공식 YouTube 채널 URL을 자동으로 socialLinks에 추가한다.

**Architecture:** Spotify 자동 채우기 후 아티스트 이름으로 YouTube Data API search.list를 호출하여 채널을 찾고, socialLinks에 `youtube` 키로 자동 삽입한다. YouTube API 호출은 별도 Next.js API route에서 처리하여 API 키를 서버 사이드에 유지한다.

**Tech Stack:** Next.js API Routes, YouTube Data API v3, TypeScript

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/admin/src/app/api/youtube/route.ts` | YouTube Data API 호출, 아티스트명으로 채널 검색 |
| Modify | `apps/admin/src/lib/api.ts` | `api.youtube.searchChannel()` 클라이언트 함수 추가 |
| Modify | `apps/admin/src/app/artists/new/page.tsx` | Spotify fetch 후 YouTube 자동 채우기 연동 |
| Modify | `apps/admin/src/app/artists/[id]/edit/page.tsx` | Spotify fetch 후 YouTube 자동 채우기 연동 |
| Modify | `apps/admin/.env.example` | `YOUTUBE_API_KEY` 항목 추가 |

---

### Task 1: YouTube API Route 생성

**Files:**
- Create: `apps/admin/src/app/api/youtube/route.ts`
- Modify: `apps/admin/.env.example`

- [ ] **Step 1: `.env.example`에 YouTube API 키 항목 추가**

`apps/admin/.env.example` 끝에 추가:

```
YOUTUBE_API_KEY=
```

실제 `.env.local`에는 Google Cloud Console에서 발급받은 키를 넣는다.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/.env.example
git commit -m "chore(admin): add YOUTUBE_API_KEY to env example"
```

- [ ] **Step 3: YouTube API route 작성**

`apps/admin/src/app/api/youtube/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface YouTubeSearchItem {
  snippet: {
    channelId: string;
    channelTitle: string;
    title: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export async function GET(request: NextRequest) {
  const artistName = request.nextUrl.searchParams.get('name');
  if (!artistName) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: artistName,
      type: 'channel',
      maxResults: '1',
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error?.message || `YouTube API error: ${res.status}` },
        { status: 502 },
      );
    }

    const data: YouTubeSearchResponse = await res.json();
    const item = data.items?.[0];

    if (!item) {
      return NextResponse.json({ channelUrl: null, channelTitle: null });
    }

    return NextResponse.json({
      channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
      channelTitle: item.snippet.channelTitle,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/api/youtube/route.ts
git commit -m "feat(admin): add YouTube channel search API route"
```

---

### Task 2: API 클라이언트에 YouTube 함수 추가

**Files:**
- Modify: `apps/admin/src/lib/api.ts:98-111`

- [ ] **Step 1: `api.ts`에 `youtube.searchChannel` 추가**

`api.spotify` 블록 뒤에 `youtube` 블록을 추가한다:

```typescript
  youtube: {
    searchChannel: async (artistName: string) => {
      const res = await fetch(
        `/api/youtube?name=${encodeURIComponent(artistName)}`,
      );
      if (!res.ok) return null;
      return res.json() as Promise<{
        channelUrl: string | null;
        channelTitle: string | null;
      }>;
    },
  },
```

최종적으로 `api` 객체에 `spotify` 다음에 `youtube`가 위치한다.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat(admin): add YouTube channel search to API client"
```

---

### Task 3: 새 아티스트 등록 페이지에 YouTube 자동 채우기 연동

**Files:**
- Modify: `apps/admin/src/app/artists/new/page.tsx:26-51`

- [ ] **Step 1: `handleSpotifyFetch` 함수에 YouTube 검색 추가**

기존 `handleSpotifyFetch` 함수에서 Spotify 데이터를 가져온 직후, 아티스트 이름으로 YouTube 채널을 검색하고 socialLinks에 추가한다.

`handleSpotifyFetch` 함수의 `try` 블록을 다음과 같이 수정:

```typescript
    try {
      const data = await api.spotify.getArtist(id);
      setName(data.name);
      setImageUrl(data.imageUrl || '');
      setSpotifyId(data.spotifyId);
      setSpotifyLink(data.spotifyUrl);

      // YouTube 채널 자동 검색
      const youtube = await api.youtube.searchChannel(data.name);

      setSocialLinks((prev) => {
        const filtered = prev.filter((l) => l.key !== 'spotify' && l.key !== 'youtube');
        const links = [{ key: 'spotify', value: data.spotifyUrl }];
        if (youtube?.channelUrl) {
          links.push({ key: 'youtube', value: youtube.channelUrl });
        }
        return [...links, ...filtered];
      });
    }
```

핵심 변경:
- `api.youtube.searchChannel(data.name)` 호출 추가
- `setSocialLinks`에서 기존 `youtube` 키도 필터링
- YouTube 채널이 발견되면 socialLinks에 자동 추가

- [ ] **Step 2: 수동 테스트**

1. `YOUTUBE_API_KEY`가 `.env.local`에 설정되어 있는지 확인
2. 어드민 앱 실행: `pnpm --filter admin dev`
3. `/artists/new` 접속
4. Spotify URL 입력 후 "자동 채우기" 클릭
5. 소셜 링크에 `spotify`와 `youtube`가 모두 자동 추가되는지 확인

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/artists/new/page.tsx
git commit -m "feat(admin): auto-fill YouTube channel on Spotify fetch (new artist)"
```

---

### Task 4: 아티스트 수정 페이지에 YouTube 자동 채우기 연동

**Files:**
- Modify: `apps/admin/src/app/artists/[id]/edit/page.tsx:48-73`

- [ ] **Step 1: `handleSpotifyFetch` 함수에 YouTube 검색 추가**

수정 페이지의 `handleSpotifyFetch`도 동일하게 변경한다. `try` 블록:

```typescript
    try {
      const data = await api.spotify.getArtist(sid);
      setName(data.name);
      setImageUrl(data.imageUrl || '');
      setSpotifyId(data.spotifyId);
      setSpotifyLink(data.spotifyUrl);

      // YouTube 채널 자동 검색
      const youtube = await api.youtube.searchChannel(data.name);

      setSocialLinks((prev) => {
        const filtered = prev.filter((l) => l.key !== 'spotify' && l.key !== 'youtube');
        const links = [{ key: 'spotify', value: data.spotifyUrl }];
        if (youtube?.channelUrl) {
          links.push({ key: 'youtube', value: youtube.channelUrl });
        }
        return [...links, ...filtered];
      });
    }
```

new 페이지와 동일한 로직이다. 유일한 차이는 `extractSpotifyId`에서 `sid` 변수를 사용하는 것.

- [ ] **Step 2: 수동 테스트**

1. 기존 아티스트의 수정 페이지 접속
2. Spotify URL 입력 후 "자동 채우기" 클릭
3. 기존 소셜 링크(instagram 등)는 유지되면서 spotify/youtube가 추가/갱신되는지 확인

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/artists/\[id\]/edit/page.tsx
git commit -m "feat(admin): auto-fill YouTube channel on Spotify fetch (edit artist)"
```

---

## 참고사항

### YouTube API 키 발급
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. YouTube Data API v3 활성화
4. API 키 생성 → `apps/admin/.env.local`에 `YOUTUBE_API_KEY=...` 추가

### API 쿼터
- YouTube Data API 무료 쿼터: 일일 10,000 units (완전 무료, 유료 과금 모델 없음)
- `search.list` 1회 = 100 units (결과 개수와 무관, 호출 자체가 100 units)
- 하루 약 100회 검색 가능. 초과 시 429 에러로 거부됨 (추가 결제 불가)
- 아티스트 등록/수정 시에만 호출되므로 충분

### 한계
- 채널 검색은 이름 기반이므로 동명이인 아티스트의 경우 잘못된 채널이 매칭될 수 있음
- YouTube API 키 미설정 시 YouTube 자동 채우기만 스킵되고 Spotify 채우기는 정상 동작
