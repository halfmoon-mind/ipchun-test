# 멜론 티켓 데이터 추출 스펙 (플랫폼 상세)

> 멜론 티켓 공연 상세 페이지(`ticket.melon.com/performance/index.htm?prodId={id}`)에서 자동 추출 가능한 데이터 분류 문서.
> 멀티 플랫폼 통합 스펙은 [ticket-platform-data-spec.md](./ticket-platform-data-spec.md) 참조.

## 참고 공연

| prodId | 공연명 | 유형 |
|--------|--------|------|
| 212888 | 현대카드 Curated 104 김승주 | 솔로 콘서트, 기업 기획 |
| 212974 | 노아코스트 단독 콘서트 'Coast Night' | 밴드 단독, 공연장 기획 |

---

## 1. 공연 기본 정보 (Performance)

공연 자체를 설명하는 핵심 메타데이터.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `prodId` | string | `212888` | `212974` | URL 파라미터, PK로 활용 |
| `title` | string | 현대카드 Curated 104 김승주 | 노아코스트 단독 콘서트 'Coast Night' : 롤링 31주년 기념공연 | |
| `subtitle` | string \| null | Foreigner / 外國人 | Noa Coast | 영문명 또는 부제 |
| `genre` | string | 콘서트 | 콘서트 | 콘서트/뮤지컬/연극/클래식 등 |
| `ageRating` | string | 전체관람가 | 전체관람가 | 전체/12세/15세/19세 |
| `posterUrl` | string (URL) | `cdnticket.melon.co.kr/...jpg` | (동일 패턴) | 고해상도 포스터 이미지 |
| `sourceUrl` | string (URL) | `ticket.melon.com/...?prodId=212888` | `ticket.melon.com/...?prodId=212974` | 원본 페이지 |

## 2. 일정 정보 (Schedule)

하나의 공연에 여러 회차가 존재할 수 있으므로 1:N 관계.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `startDate` | date | 2026-03-29 | 2026-04-24 | |
| `endDate` | date | 2026-03-29 | 2026-04-24 | 다회차 공연은 종료일 상이 |
| `showTime` | time | 18:00 | 20:00 | |
| `runtime` | number (분) | 100 | 120 | 관람 소요 시간 |
| `ticketOpenAt` | datetime | 2026-03-06T20:00 | 2026-03-23T20:00 | 예매 오픈 일시 |

## 3. 장소 정보 (Venue)

공연장은 여러 공연에서 재사용되므로 별도 엔티티로 관리.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `venueName` | string | 현대카드 언더스테이지 | 롤링홀 | |
| `address` | string | 서울 용산구 이태원로 246 | 서울 마포구 서교동 402-22 | |
| `phone` | string \| null | 02-331-6301 | 02-325-6071 | |
| `website` | string \| null | dive.hyundaicard.com/... | rollinghall.co.kr | |

## 4. 아티스트 정보 (Artist)

출연진. 다수 아티스트가 출연 가능하므로 M:N 관계.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `artistName` | string | 김승주 | 노아코스트 | |
| `relatedSongs` | string[] | 주인공의법칙, 엔진, 교환학생 | (대표곡 3곡) | 멜론 음원 연결 |
| `melonArtistUrl` | string \| null | (링크 추출 가능) | (링크 추출 가능) | 멜론 아티스트 페이지 |

## 5. 티켓/가격 정보 (Ticket)

좌석 등급별로 가격이 다를 수 있으므로 1:N 관계.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `seatGrade` | string | 전석 | 일반 | 등급명 |
| `price` | number | 66000 | 55000 | 원 단위 |
| `maxPerUser` | number | 4 | 4 | 1인 최대 매수 |
| `salesStatus` | string | 단독판매 | 단독판매 | 판매중/매진/예정 등 |
| `badges` | string[] | [인증예매, 청년패스] | [청년패스] | 예매 특이사항 태그 |

## 6. 할인 정보 (Discount)

티켓에 종속되는 할인 목록. 1:N 관계.

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `discountName` | string | 현대카드 할인 | - | |
| `discountRate` | number (%) | 20 | - | |
| `discountType` | enum | 카드사 / 복지 / 기타 | - | |
| `installment` | string \| null | 2~6개월 무이자 | 2~6개월 무이자 | 무이자 할부 정보 |

## 7. 주최/기획 정보 (Organizer)

| 필드 | 타입 | 예시 (212888) | 예시 (212974) | 비고 |
|------|------|---------------|---------------|------|
| `producer` | string \| null | 위트 | - | 기획사 |
| `host` | string \| null | 현대카드 | 주식회사 롤링홀 | 주최 |
| `organizer` | string \| null | 테잎스(tapes) / 위트 | 주식회사 롤링컬쳐원 | 주관 |
| `contactPhone` | string | 02-323-2460 | 02-325-6071 | 공연 문의 |
| `contactEmail` | string \| null | - | rollinghall@hanmail.net | |
| `ticketPhone` | string | 1899-0042 | 1899-0042 | 예매 문의 (멜론 공통) |

## 8. 취소/환불 정책 (CancellationPolicy)

구간별 수수료. 멜론 티켓 공통 정책이지만 공연마다 미세 차이 가능.

| 구간 | 수수료 | 비고 |
|------|--------|------|
| 예매 후 7일 이내 | 무료 | |
| 예매 후 8일 ~ 관람일 10일전 | 4,000원 (최대 10%) | |
| 관람일 9~7일전 | 티켓 금액의 10% | |
| 관람일 6~3일전 | 티켓 금액의 20% | |
| 관람일 2~1일전 | 티켓 금액의 30% | |

> 대부분 동일한 패턴이므로 기본 정책으로 저장하고, 예외가 있는 경우만 오버라이드.

---

## 데이터 관계도 (ERD 요약)

```
Performance (공연)
├── 1:N  Schedule (회차/일정)
├── M:N  Artist (출연진)
│         └── relatedSongs[]
├── N:1  Venue (장소)
├── 1:N  Ticket (좌석/가격 등급)
│         └── 1:N  Discount (할인)
├── 1:1  Organizer (주최/기획)
└── 1:1  CancellationPolicy (취소 정책)
```

## 필드 안정성 분류

멜론 티켓 페이지에서 **항상 존재하는 필드**와 **공연에 따라 없을 수 있는 필드**를 구분.

### 항상 존재 (Required)

- `prodId`, `title`, `genre`, `ageRating`, `posterUrl`
- `startDate`, `endDate`, `showTime`
- `venueName`, `address`
- `seatGrade`, `price`, `maxPerUser`
- `ticketOpenAt`

### 조건부 존재 (Optional)

- `subtitle` — 영문명/부제가 없는 공연 존재
- `runtime` — 미정인 경우 있음
- `relatedSongs` — 멜론 음원이 없는 아티스트
- `melonArtistUrl` — 멜론에 등록되지 않은 아티스트
- `discountName`, `discountRate` — 할인이 없는 공연
- `producer`, `host`, `organizer` — 기획 구조에 따라 일부 누락
- `contactEmail` — 이메일 비공개인 경우
- `website` (Venue) — 웹사이트 미등록 공연장

---

## IPCHUN 플랫폼 활용 매핑

각 데이터가 IPCHUN의 어떤 기능에 매핑되는지 정리.

| 데이터 | 활용 기능 | 우선순위 |
|--------|-----------|----------|
| 공연 기본 정보 + 일정 | 공연 일정 트래킹 (핵심 기능) | **P0** |
| 아티스트 | 아티스트 프로필 연결, 팔로잉 | **P0** |
| 장소 | Venue DB 축적, 지도 연동 | **P1** |
| 포스터 이미지 | 카드뉴스 자동 생성 소재 | **P1** |
| 티켓 오픈일시 | 예매 알림 기능 | **P1** |
| 가격 + 할인 | 가격 비교, 할인 정보 안내 | **P2** |
| 주최/기획 | 기획사 기반 추천 | **P2** |
| 취소 정책 | 참고 정보 표시 | **P3** |
| 관련 음악 | 아티스트 프로필 보강 | **P3** |
