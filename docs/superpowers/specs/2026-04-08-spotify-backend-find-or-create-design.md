# Spotify 백엔드 통합 + Artist find-or-create

> 2026-04-08 | Spotify API를 NestJS 백엔드로 이전하고, 아티스트 자동 매칭/생성 엔드포인트를 추가한다.

## 배경

- register-performance 스킬이 아티스트를 `name`만으로 생성 → Spotify 연결 없는 빈껍데기 아티스트
- Spotify 연동이 Admin Next.js API route에만 존재 → 스킬/모바일에서 사용 불가
- 동일 아티스트가 Spotify 연결 없이 중복 생성되는 문제

## 목표

1. NestJS 백엔드에 SpotifyModule 추가 (토큰 관리 + API 호출)
2. `POST /artists/find-or-create` 엔드포인트로 DB 검색 → Spotify 매칭 → 풍부한 데이터로 자동 생성
3. Admin의 Spotify route를 백엔드 엔드포인트로 대체
4. register-performance 스킬이 find-or-create를 사용하도록 수정

## 스코프 외

- YouTube 채널 자동 검색 (별도 작업)
- 모바일 앱 변경

---

## 아키텍처

### 새 모듈: SpotifyModule

```
apps/server/src/spotify/
├── spotify.module.ts
├── spotify.service.ts
└── types/spotify.types.ts
```

`SpotifyModule`은 `SpotifyService`를 export. `ArtistModule`에서 import하여 사용.

### SpotifyService

**토큰 관리**: Client Credentials 플로우. 메모리 캐싱, 만료 60초 전 갱신.

```typescript
class SpotifyService {
  // Spotify 아티스트 검색 (limit=5)
  async search(query: string): Promise<SpotifySearchResult[]>

  // Spotify 아티스트 상세 (API 3개 병렬 + HTML 파싱)
  async getArtist(spotifyId: string): Promise<SpotifyArtistDetail>
}
```

**search** 반환:
```typescript
interface SpotifySearchResult {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  followers: number;
}
```

**getArtist** 반환:
```typescript
interface SpotifyArtistDetail {
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

**getArtist 내부 병렬 호출**:
1. `GET https://api.spotify.com/v1/artists/{id}` — 기본 정보
2. `GET https://api.spotify.com/v1/artists/{id}/top-tracks?market=KR` — 인기 트랙 5개
3. `GET https://api.spotify.com/v1/artists/{id}/related-artists` — 관련 아티스트 5개
4. `GET https://open.spotify.com/artist/{id}` — HTML에서 monthly listeners 파싱 (og:description)

**description 추출**: open.spotify.com HTML의 JSON-LD에서 description 추출. "Listen to {name} on Spotify" 같은 자동 생성 문구는 무시 (null 반환).

**환경변수**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

---

## 엔드포인트

### `POST /artists/find-or-create`

**Request**:
```json
{ "name": "문별" }
```

**로직**:
1. DB에서 이름 검색 (case-insensitive 완전 일치) → 있으면 반환 (200)
2. Spotify 검색 → 이름 완전 일치 결과 우선, 없으면 followers 최다 선택
3. Spotify 매칭 성공 → getArtist로 상세 정보 → DB 생성 (201)
4. Spotify 매칭 실패 (결과 없음) → 이름만으로 DB 생성 (201)
5. Spotify API 에러 → 이름만으로 DB 생성 (Spotify 장애가 아티스트 등록을 막지 않음)

**이름 완전 일치 비교**: 양쪽 모두 trim + lowercase 후 비교.

**Response**: 200 또는 201, Artist 객체 전체 반환.

### `GET /artists/spotify/search?q=문별`

Admin UI의 아티스트 제안 기능용. `SpotifyService.search()` 결과 그대로 반환.

### `GET /artists/spotify/:spotifyId`

Admin UI의 아티스트 상세 조회용. `SpotifyService.getArtist()` 결과 반환.

---

## Admin 변경

### 삭제

- `apps/admin/src/app/api/spotify/route.ts`
- `apps/admin/src/app/api/spotify/search/route.ts`

### 수정

**`apps/admin/src/lib/api.ts`**:
- `spotify.search(q)` → `GET {BASE_URL}/artists/spotify/search?q=`
- `spotify.getArtist(id)` → `GET {BASE_URL}/artists/spotify/{id}`

**`apps/admin/src/app/performances/components/artist-suggestions.tsx`**:
- Spotify 선택 시 `handleSelectSpotify`에서 직접 `/api/spotify` 호출하던 로직 → 백엔드 엔드포인트 사용
- 아티스트 생성 시 이미 enriched된 데이터를 `POST /artists`로 전송하는 기존 로직은 유지 (Admin에서는 사용자가 선택하므로 find-or-create가 아닌 명시적 생성)

---

## 스킬 변경

### SKILL.md

**"아티스트 검색/생성" 섹션** 교체:

```
1. POST /artists/find-or-create {"name": "아티스트명"}
2. 서버가 DB 검색 → Spotify 매칭 → 자동 생성
3. 반환된 artistId를 PUT /performances/:id/artists에 사용
```

**"아티스트 생성 시 정보 보강" 섹션** 삭제 — 서버가 자동 처리.

### api-cheatsheet.md

새 엔드포인트 3개 추가:
- `POST /artists/find-or-create`
- `GET /artists/spotify/search?q=`
- `GET /artists/spotify/:spotifyId`

---

## 에러 처리

| 상황 | 동작 |
|------|------|
| Spotify 자격증명 미설정 | 경고 로그, Spotify 없이 이름만 생성 |
| Spotify API 타임아웃/에러 | 이름만으로 생성, 에러 로그 |
| Spotify 검색 결과 0건 | 이름만으로 생성 |
| DB에 동일 spotifyId 이미 존재 | 해당 기존 아티스트 반환 |

핵심 원칙: **Spotify 장애가 아티스트 등록을 막지 않는다.**

---

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `apps/server/src/spotify/spotify.module.ts` | 신규 |
| `apps/server/src/spotify/spotify.service.ts` | 신규 |
| `apps/server/src/spotify/types/spotify.types.ts` | 신규 |
| `apps/server/src/artist/artist.module.ts` | SpotifyModule import 추가 |
| `apps/server/src/artist/artist.service.ts` | findOrCreate 메서드 추가 |
| `apps/server/src/artist/artist.controller.ts` | 엔드포인트 3개 추가 |
| `apps/server/src/artist/dto/find-or-create-artist.dto.ts` | 신규 |
| `apps/server/src/app.module.ts` | SpotifyModule 등록 |
| `apps/server/.env` | SPOTIFY_CLIENT_ID/SECRET 추가 |
| `apps/admin/src/app/api/spotify/route.ts` | 삭제 |
| `apps/admin/src/app/api/spotify/search/route.ts` | 삭제 |
| `apps/admin/src/lib/api.ts` | Spotify 호출 대상 변경 |
| `apps/admin/src/app/performances/components/artist-suggestions.tsx` | 백엔드 호출로 전환 |
| `.claude/skills/register-performance/SKILL.md` | 아티스트 섹션 수정 |
| `.claude/skills/register-performance/references/api-cheatsheet.md` | 엔드포인트 추가 |
