## 혁오 Spotify 연결 결과: 부분 성공

### 수행 과정

1. DB 조회: `GET /artists` — 혁오가 DB에 없었음
2. 아티스트 생성: `POST /artists/find-or-create` — 신규 생성됨 (Spotify 자동 매칭 실패)
3. Spotify 검색 API 실패 (sandbox 제한)
4. 웹 검색으로 우회: Spotify ID `57okaLdCtv3nVBSn5otJkp` 확인
5. `PATCH /artists/{id}` — spotifyId, spotifyUrl, socialLinks 업데이트 성공

### 최종 DB 상태

| 필드 | 값 |
|------|-----|
| name | 혁오 |
| spotifyId | 57okaLdCtv3nVBSn5otJkp |
| spotifyUrl | https://open.spotify.com/artist/57okaLdCtv3nVBSn5otJkp |
| socialLinks | `{"spotify": "..."}` |
| imageUrl | null (미수집) |
| monthlyListeners | null (미수집) |
| spotifyMeta | null (미수집) |

### 미완료

`imageUrl`, `monthlyListeners`, `spotifyMeta`는 Spotify API 인증 실패로 수집 못함.
