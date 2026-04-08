---
name: spotify-sync
description: "아티스트 Spotify 연결 감사 & 자동 동기화 — DB의 전체 아티스트를 조회하여 Spotify 미연결 아티스트를 찾고, Spotify API 검색을 통해 자동으로 연결한다. Use when: 'spotify 연결', 'spotify sync', '스포티파이 동기화', '아티스트 스포티파이', 'spotify 연결 안된', '스포티파이 누락', 'spotify audit', '아티스트 정보 보완', '스포티파이 매칭' 등을 언급할 때. 아티스트 목록을 보고 Spotify 상태를 점검하거나, 미연결 아티스트를 일괄 연결하고 싶을 때 사용."
---

# Spotify Sync: 아티스트 Spotify 자동 연결

DB에 등록된 아티스트 중 Spotify과 연결되지 않은 아티스트를 찾아 자동으로 Spotify 정보를 매칭·업데이트한다.

## Arguments

- `/spotify-sync` — 미연결 아티스트 전체 스캔 & 연결
- `/spotify-sync audit` — 현황만 보고 (연결/미연결 리스트 출력, 수정 없음)
- `/spotify-sync <아티스트명>` — 특정 아티스트 1명만 Spotify 연결

## API 환경

로컬 또는 프로덕션 서버를 자동 감지한다:

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/artists"
```
200이면 로컬(`http://localhost:3000`) 사용. 실패하면 프로덕션(`https://api.ipchun.live`) 사용. 둘 다 안 되면 중단하고 사용자에게 알림.

## 워크플로우

### 1단계: 전체 아티스트 조회

```bash
curl -s "$BASE_URL/artists" | jq .
```

응답에서 각 아티스트의 `id`, `name`, `spotifyId` 확인.

### 2단계: 미연결 아티스트 필터링

`spotifyId`가 `null`인 아티스트를 추출한다. 결과를 사용자에게 요약 보고:

```
## Spotify 연결 현황
- 전체 아티스트: N명
- Spotify 연결됨: X명
- 미연결: Y명

### 미연결 아티스트 목록
1. 아티스트A (id: xxx)
2. 아티스트B (id: yyy)
...
```

**중복 감지:** 이 단계에서 이름이 유사한 아티스트 쌍(예: 영문명/한글명 중복 — `kimseungjoo`와 `김승주`)을 발견하면 사용자에게 알린다. 이미 Spotify이 연결된 아티스트와 미연결 아티스트가 동일인일 수 있으므로, 연결 전에 중복 여부를 먼저 확인한다.

`audit` 모드면 여기서 종료.

### 3단계: Spotify 검색 & 매칭

미연결 아티스트 각각에 대해:

```bash
curl -s "$BASE_URL/artists/spotify/search?q={아티스트명}" | jq .
```

검색 결과를 평가하여 최적 매칭을 선택한다:

- **자동 매칭 기준** (아래 조건을 모두 충족하면 사용자 확인 없이 진행):
  - 검색 결과 1위의 이름이 DB 아티스트명과 동일하거나 거의 동일 (대소문자·공백 무시)
  - followers가 100 이상 (너무 작은 계정은 동명이인 가능성)

- **수동 확인 필요** (아래 중 하나라도 해당):
  - 이름이 정확히 일치하지 않음
  - 검색 결과가 없음
  - 동명이인이 의심됨 (결과가 여러 개이고 followers가 비슷)

**Fallback (API 검색 실패 시):** Spotify 검색 API가 빈 결과를 반환하거나 에러가 발생하면, 한글명 대신 영문명이나 로마자 표기로 재시도한다. 그래도 안 되면 웹 검색(`open.spotify.com/artist` + 아티스트명)으로 Spotify 프로필을 직접 찾아 spotifyId를 추출한다.

수동 확인이 필요한 경우, 검색 결과를 사용자에게 보여주고 선택을 요청한다:

```
### "아티스트명" Spotify 검색 결과
1. Artist Name (followers: 12,345) — spotifyId: abc123
2. Artist Name2 (followers: 456) — spotifyId: def456
3. (없음 — 건너뛰기)

어떤 것을 연결할까요? (번호 또는 'skip')
```

### 4단계: Spotify 상세 정보 가져오기

매칭된 spotifyId로 상세 정보를 조회:

```bash
curl -s "$BASE_URL/artists/spotify/{spotifyId}" | jq .
```

응답에서 `name`, `imageUrl`, `description`, `spotifyId`, `spotifyUrl`, `monthlyListeners`, `spotifyMeta`를 추출.

**상세 조회 실패 시:** 4단계에서 상세 정보를 가져오지 못하면(API 인증 실패 등), 3단계에서 확보한 `spotifyId`만으로라도 기본 정보(`spotifyId`, `spotifyUrl`, `socialLinks`)를 업데이트한다. 불완전하더라도 연결 자체는 해두는 것이 나중에 보완할 수 있어 더 낫다.

### 5단계: 아티스트 업데이트

**반드시 PATCH를 사용한다** — 이미 DB에 존재하는 아티스트이므로 POST로 새로 만들지 않는다. 아티스트가 DB에 없는 경우에만 `POST /artists/find-or-create`를 사용한다.

```bash
curl -s -X PATCH "$BASE_URL/artists/{artistId}" \
  -H "Content-Type: application/json" \
  -d '{
    "spotifyId": "...",
    "spotifyUrl": "...",
    "imageUrl": "...",
    "description": "...",
    "monthlyListeners": ...,
    "spotifyMeta": { ... },
    "socialLinks": { "spotify": "..." }
  }'
```

기존 `socialLinks`가 있으면 Spotify URL만 추가/업데이트하고 다른 링크는 보존한다. 기존 `imageUrl`이 있으면 덮어쓰지 않는다 (사용자가 직접 설정한 이미지일 수 있음).

### 6단계: 결과 리포트

모든 처리가 끝나면 결과를 정리하여 보고:

```
## Spotify Sync 결과
- 자동 연결 성공: N명
- 수동 확인 후 연결: M명
- 건너뜀 (검색 결과 없음): K명
- 건너뜀 (사용자 스킵): L명

### 연결된 아티스트
| 아티스트 | Spotify | Monthly Listeners |
|---------|---------|-------------------|
| 아티스트A | ✅ Artist A | 12,345 |
| 아티스트B | ✅ Artist B | 67,890 |

### 미연결 (수동 처리 필요)
- 아티스트C: 검색 결과 없음
```

## 핵심 원칙

1. **모든 DB 수정은 REST API** — Prisma 직접 호출 금지. curl로 API 호출.
2. **요청 딜레이 1초** — Spotify API rate limit 존중. 각 검색/조회 사이에 `sleep 1`.
3. **안전한 업데이트** — 기존 데이터를 덮어쓰지 않도록 주의:
   - `imageUrl`: 기존 값이 있으면 보존
   - `socialLinks`: 기존 링크에 spotify만 추가
   - `name`: 변경하지 않음 (DB의 한글명 유지)
4. **Claude 판단 활용** — 이름 유사도, followers 수, 장르 등을 종합 판단하여 동명이인 구별. 확신 없으면 사용자에게 확인.
5. **에러 시 건너뛰기** — 한 아티스트에서 에러가 발생해도 나머지는 계속 진행. 에러 아티스트는 리포트에 포함.
