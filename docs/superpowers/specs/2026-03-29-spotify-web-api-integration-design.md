# Spotify Web API 기반 아티스트 자동 채우기

## 개요

Admin에서 아티스트 등록/수정 시 Spotify 링크만 입력하면 Spotify Web API를 통해 아티스트 정보를 자동으로 채워주는 기능. 기존 HTML 스크래핑 방식을 공식 API로 교체하고, 추가 데이터(장르, 인기 트랙, 관련 아티스트 등)를 수집한다.

## 인증

- **Flow:** OAuth 2.0 Client Credentials (앱 전용, 사용자 로그인 불필요)
- **위치:** Admin Next.js API route (`/api/spotify/route.ts`)에서 처리
- **자격 증명:** `apps/admin/.env.local`에 `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` 저장
- **토큰 관리:** `POST https://accounts.spotify.com/api/token`으로 획득. 1시간 유효. 모듈 스코프 변수에 캐싱하여 만료 전까지 재사용.

## 호출할 API 엔드포인트

| 엔드포인트 | 데이터 |
|-----------|--------|
| `GET /v1/artists/{id}` | name, genres, followers, popularity, images (다해상도) |
| `GET /v1/artists/{id}/top-tracks` | 인기 트랙 최대 10곡 (제목, popularity, preview_url, 앨범명, 앨범 이미지) |
| `GET /v1/artists/{id}/related-artists` | 관련 아티스트 최대 20명 (name, spotifyId, genres, imageUrl) |

추가로 기존 메인 페이지(`open.spotify.com/artist/{id}`) og:description에서 월간 리스너 수를 파싱한다. 이 데이터는 Web API에 없다.

총 API 호출: Spotify Web API 3회 + HTML fetch 1회 = 4회 (병렬 처리)

## DB 스키마 변경

Artist 테이블에 2개 컬럼 추가:

```prisma
model Artist {
  // ... 기존 필드
  monthlyListeners Int?    @map("monthly_listeners")
  spotifyMeta      Json?   @map("spotify_meta")
}
```

> `monthly_listeners` 컬럼은 이전에 제거된 적이 있으나, 정렬/필터 쿼리 용도로 다시 추가한다.

## `spotifyMeta` JSON 구조

```typescript
interface SpotifyMeta {
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
```

## Spotify API Route 변경

`apps/admin/src/app/api/spotify/route.ts`를 전면 교체:

1. Spotify client_credentials 토큰 획득 (캐싱)
2. 4개 요청 병렬 실행: artist, top-tracks, related-artists, 메인 페이지 HTML
3. 응답 조합하여 통합 데이터 반환

응답 타입:

```typescript
interface SpotifyArtistData {
  name: string;
  imageUrl: string | null;
  description: string | null;
  spotifyId: string;
  spotifyUrl: string;
  monthlyListeners: number | null;
  spotifyMeta: SpotifyMeta | null;
}
```

## Shared 타입 변경

```typescript
export interface Artist {
  // ... 기존 필드
  monthlyListeners: number | null;
  spotifyMeta: SpotifyMeta | null;
}

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
```

## Server DTO 변경

`CreateArtistDto`에 2개 필드 추가:

```typescript
@IsInt() @IsOptional() monthlyListeners?: number;
@IsObject() @IsOptional() spotifyMeta?: Record<string, unknown>;
```

## Admin UI 변경

### Spotify 정보 섹션 확장 (new/edit 페이지 공통)

Spotify fetch 성공 시 기존 Spotify ID/링크 외에 추가 표시:

- **장르 배지** — `genres`를 태그로 나열
- **수치 정보** — 월간 리스너, 팔로워, 인기도 점수
- **인기 트랙** — 트랙명 리스트 (최대 5곡, 간결하게)
- **관련 아티스트** — 이름 + 이미지 (정보 표시만, 등록 버튼 없음)

submit 시 `monthlyListeners`와 `spotifyMeta`를 함께 서버에 전송.

## 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/admin/.env.example` | Spotify 키 placeholder 추가 |
| `apps/admin/src/app/api/spotify/route.ts` | 스크래핑 → Web API 호출로 전면 교체 |
| `apps/admin/src/lib/api.ts` | spotify 응답 타입 확장 |
| `apps/admin/src/app/artists/new/page.tsx` | 새 데이터 UI 표시 + submit 데이터 확장 |
| `apps/admin/src/app/artists/[id]/edit/page.tsx` | 동일 |
| `apps/server/prisma/schema.prisma` | `monthlyListeners`, `spotifyMeta` 컬럼 추가 |
| `apps/server/src/artist/dto/create-artist.dto.ts` | 2개 필드 추가 |
| `packages/shared/src/index.ts` | `Artist` 인터페이스 + `SpotifyMeta` 타입 추가 |

## 에러 처리

- Spotify API 키 미설정 시: 에러 메시지 표시 ("Spotify API 키가 설정되지 않았습니다")
- API rate limit (429): 에러 메시지 표시, 재시도 안내
- 개별 엔드포인트 실패: 해당 데이터만 null, 나머지는 정상 반환

## 스코프 밖

- 관련 아티스트 "등록" 버튼
- 오디오 프리뷰 재생 기능
- 앨범 목록 저장 (별도 테이블 필요)
- Spotify 데이터 자동 갱신/동기화
