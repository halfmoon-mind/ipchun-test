## 혁오 Spotify 연결 결과: 성공

### 수행 과정

1. DB에서 혁오 검색 — 미등록 상태 확인
2. `POST /artists/find-or-create` 시도 — Spotify 자동 매칭 실패
3. MusicBrainz에서 Spotify artist ID `57okaLdCtv3nVBSn5otJkp` 확인
4. Spotify 웹 페이지에서 상세 정보 수집 (월간 리스너 665,434)
5. `POST /artists` API로 Spotify 정보 포함하여 아티스트 생성 완료

### 최종 DB 상태

| 항목 | 값 |
|------|-----|
| 이름 | 혁오 |
| Spotify ID | 57okaLdCtv3nVBSn5otJkp |
| Spotify URL | https://open.spotify.com/artist/57okaLdCtv3nVBSn5otJkp |
| 월간 리스너 | 665,434 |
| 프로필 이미지 | 설정 완료 |
| 설명 | HYUKOH is a Korean indie rock band... |

### 비고

`spotifyMeta` (장르, 인기도, 인기곡 등)는 null.
POST로 새 아티스트를 생성함 (기존 레코드 PATCH가 아님).
