# API Cheatsheet

BASE_URL은 스킬 실행 시 결정 (로컬 `http://localhost:3000` 또는 프로덕션 `https://api.ipchun.live`).

## Performance

### Fetch (프리뷰)
```bash
curl -X POST $BASE_URL/performances/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tickets.interpark.com/goods/12345"}'
```
- 200: `FetchedPerformance` 객체 반환
- 409: 이미 등록된 소스 (body에 기존 공연 정보)

### Create
```bash
curl -X POST $BASE_URL/performances \
  -H "Content-Type: application/json" \
  -d '{
    "title": "공연 제목",
    "genre": "CONCERT",
    "venueName": "공연장명",
    "venueAddress": "주소",
    "platform": "MELON",
    "externalId": "12345",
    "sourceUrl": "https://...",
    "ticketOpenAt": "2026-04-01T00:00:00.000Z",
    "salesStatus": "ON_SALE",
    "schedules": [{"dateTime": "2026-05-01T19:00:00.000Z"}],
    "tickets": [{"seatGrade": "전석", "price": 55000}]
  }'
```

### Get Detail
```bash
curl $BASE_URL/performances/{id}
```

### Update
```bash
curl -X PATCH $BASE_URL/performances/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SOLD_OUT",
    "schedules": [{"dateTime": "2026-05-01T19:00:00.000Z"}]
  }'
```

### Delete
```bash
curl -X DELETE $BASE_URL/performances/{id}
```

## Performance Artists

### Replace Lineup
```bash
curl -X PUT $BASE_URL/performances/{id}/artists \
  -H "Content-Type: application/json" \
  -d '{
    "artists": [
      {"artistId": "uuid-1", "performanceOrder": 1},
      {"artistId": "uuid-2", "performanceOrder": 2}
    ]
  }'
```

### Remove Single Artist
```bash
curl -X DELETE $BASE_URL/performances/{id}/artists/{artistEntryId}
```

## Performance Sources

### Add Source (크로스 플랫폼 병합용)

> 이 엔드포인트가 서버에 없으면 추가가 필요하다 (SKILL.md 참조).

```bash
curl -X POST $BASE_URL/performances/{id}/sources \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "NOL",
    "externalId": "67890",
    "sourceUrl": "https://tickets.interpark.com/goods/67890",
    "ticketOpenAt": "2026-04-01T00:00:00.000Z",
    "bookingEndAt": "2026-05-01T00:00:00.000Z",
    "salesStatus": "ON_SALE",
    "tickets": [{"seatGrade": "전석", "price": 55000}]
  }'
```

## Artist

### Search
```bash
curl "$BASE_URL/artists?search=아티스트이름"
```
- 이름 부분 일치 (case-insensitive)

### Create
```bash
curl -X POST $BASE_URL/artists \
  -H "Content-Type: application/json" \
  -d '{"name": "아티스트이름"}'
```
- 201: 생성 성공, 아티스트 객체 반환
- 409: spotifyId 충돌 (이름만으로 생성 시 발생하지 않음)

### Get Detail
```bash
curl $BASE_URL/artists/{id}
```

## Enums

### Genre
CONCERT, MUSICAL, PLAY, CLASSIC, FESTIVAL, BUSKING, RELEASE, OTHER

### PerformanceStatus
SCHEDULED, ON_SALE, SOLD_OUT, COMPLETED, CANCELLED

### TicketPlatform
MELON, NOL, TICKETLINK, YES24

### LineupMode
LINEUP, TIMETABLE
