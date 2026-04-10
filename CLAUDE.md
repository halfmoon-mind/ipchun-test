# IPCHUN Project Guidelines

인디 밴드/아티스트 팬 플랫폼 — 아티스트 정보와 공연 일정을 한눈에 트래킹하고, 카드뉴스를 생성·관리하는 서비스.

## Tech Stack

| Area | Stack |
|------|-------|
| Monorepo | pnpm workspaces |
| Server | NestJS 11, Prisma 7, PostgreSQL |
| Mobile | React Native (Expo SDK 55), expo-router |
| Admin | Next.js 16, Tailwind CSS v4 |
| Common | TypeScript 5 |
| API Docs | @nestjs/swagger (OpenAPI 3.0), Swagger UI at `/api-docs` |

## Design System (`design.pen`)

에디토리얼 매거진 스타일 기반의 디자인 시스템. shadcn/ui 구조를 기반으로 하되, 매거진 같은 표현적 타이포그래피와 고유한 컬러 팔레트를 사용한다.

### Visual Identity

- **Style:** Editorial Magazine — sharp corners (radius: 0), warm minimalism
- **Typography:** Noto Serif KR (headings, section titles) + Pretendard (body, UI)
- **Background:** Warm off-white `#FDFCF9` (paper-like)
- **Accent:** Monochromatic black `#1A1A1A`
- **Corners:** Zero radius throughout (editorial/print aesthetic)

### Design Tokens (Variables)

| Token | Value | Usage |
|-------|-------|-------|
| `$--background` | `#FDFCF9` | Page background |
| `$--foreground` | `#1A1A1A` | Primary text |
| `$--primary` | `#1A1A1A` | Primary actions, buttons |
| `$--primary-foreground` | `#FFFFFF` | Text on primary |
| `$--secondary` | `#F5F2ED` | Secondary fills |
| `$--secondary-foreground` | `#1A1A1A` | Text on secondary |
| `$--muted` | `#F5F2ED` | Muted backgrounds |
| `$--muted-foreground` | `#777777` | Secondary text, placeholders |
| `$--accent` | `#E8E5DF` | Subtle fills |
| `$--border` | `#E5E2DC` | Borders, dividers |
| `$--input` | `#E5E2DC` | Input borders |
| `$--destructive` | `#DC2626` | Danger actions |
| `$--color-success` | `#22C55E` | Success status |
| `$--color-warning` | `#F59E0B` | Warning status |
| `$--color-error` | `#DC2626` | Error status |
| `$--font-primary` | `Noto Serif KR` | Headings, section titles |
| `$--font-secondary` | `Pretendard` | Body, labels, UI |

### Component Reference

| Component | ID | Descendant IDs |
|-----------|----|----------------|
| **Button/Primary** | `APQZU` | icon: `nC0EH`, label: `ANFCL` |
| **Button/Secondary** | `at6HR` | icon: `8UoFu`, label: `tpSvq` |
| **Button/Outline** | `NbWNp` | icon: `4xRmV`, label: `guG6m` |
| **Button/Ghost** | `CKFGZ` | icon: `mOtCr`, label: `jq1c7` |
| **Button/Destructive** | `dzBQL` | icon: `NMQ2a`, label: `xZxjI` |
| **InputGroup** | `n6McX` | label: `A7ym2`, field: `CdQ1D`, placeholder: `Sp5Dz`, description: `oLGkr` |
| **TextareaGroup** | `AD41r` | label: `UaX6d`, field: `CUaWG`, placeholder: `46G2p` |
| **SelectGroup** | `lh0jX` | label: `Almjp`, field: `rfD7v`, value: `uzZ9I`, chevron: `Drbg0` |
| **Badge/Default** | `jDAYN` | label: `f7i6P` |
| **Badge/Success** | `8BcYQ` | label: `Rkv0Q` |
| **Badge/Warning** | `WuJlA` | label: `nC7Ef` |
| **Badge/Error** | `8laNo` | label: `L47XA` |
| **Card** | `Qn54U` | headerSlot: `aSTAm`, title: `Ajkyf`, description: `KqxJK`, contentSlot: `BCuSM`, actionsSlot: `OkF00` |
| **Table/HeaderRow** | `kUBUP` | cell: `GgXuq`, label: `vcokP` |
| **Table/DataRow** | `yodKc` | cell: `tyI9R`, label: `Hs34t` |
| **Table/Cell** | `7tDhm` | label: `2oHhZ` |
| **Sidebar/ItemActive** | `ohEX1` | icon: `XBA2s`, label: `flIKm` |
| **Sidebar/ItemDefault** | `mCCrd` | icon: `slnTJ`, label: `v4vEO` |
| **Sidebar** | `OFn9i` | brandName: `ADgzm`, navSlot: `kDYJF` |
| **Modal** | `zjiEa` | overlay: `TqBbM`, dialog: `3DMYc`, headerSlot: `eLHEh`, title: `V5hlM`, description: `JMsar`, closeIcon: `TVOC4`, contentSlot: `K2HXk`, actionsSlot: `hWdx3` |
| **Checkbox/Checked** | `29LP9` | box: `Xxwcp`, label: `2v16J` |
| **Checkbox/Unchecked** | `uUz7R` | box: `8h8I2`, label: `jID3J` |
| **Toggle/On** | `0mj4k` | knob: `AzrOk` |
| **Toggle/Off** | `lAJAr` | knob: `CzTQ1` |

## Data Model: Artist ↔ Performance

Artist와 Performance는 `PerformanceArtist` 중간 테이블(라인업)로 다대다 연결된다.

### 핵심 모델

| Model | 역할 | 주요 필드 |
|-------|------|----------|
| `Artist` | 아티스트 | `name`, `spotifyId`, `spotifyUrl`, `imageUrl`, `socialLinks`, `monthlyListeners`, `spotifyMeta` |
| `Performance` | 공연 | `title`, `status`, `genre`, `venueId`, `lineupMode` |
| `PerformanceArtist` | 라인업(중간 테이블) | `artistId`, `performanceId`, `role`, `stageName`, `stage`, `startTime`, `endTime`, `performanceOrder`, `performanceScheduleId` |

### 관계 구조

```
Artist ──┐                    ┌── Performance
         │  PerformanceArtist │
         └──── artistId ──────┘
                performanceId
                stageName (공연별 활동명)
                role, stage, performanceOrder
```

- **unique constraint**: `[performanceId, artistId]` — 한 공연에 같은 아티스트 중복 불가
- `stageName`: 공연에서 사용하는 이름이 DB `name`과 다를 때 (예: 한글명↔영문명)
- `performanceScheduleId`: 일정별 아티스트 배정 (페스티벌 등)

### 주요 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/performances?artistId={id}` | 특정 아티스트의 공연 목록 (period=upcoming/past, cursor 페이지네이션) |
| `GET` | `/performances/calendar?year=&month=&artistId=` | 월별 공연 캘린더 |
| `PUT` | `/performances/:id/artists` | 공연 라인업 전체 교체 |
| `DELETE` | `/performances/:id/artists/:entryId` | 라인업에서 아티스트 제거 |
| `GET` | `/artists` | 전체 아티스트 (search 쿼리 지원) |
| `PATCH` | `/artists/:id` | 아티스트 정보 수정 |
| `POST` | `/artists/find-or-create` | 이름으로 찾거나 새로 생성 (Spotify 자동 연결 시도) |

### 아티스트 이름 관례

한국 인디 아티스트는 한글명과 전혀 다른 영문 활동명을 쓰는 경우가 많다:
- 고고학 → Gogohawk, 심아일랜드 → SIMILE LAND, 급한노새 → Rosai In Hurry, 네미시스 → Nemesis

DB `name`은 한글명을 유지하고, Spotify 등 외부 서비스 매칭 시 영문 활동명을 별도로 추론해야 한다. 공연 제목에 영문명이 괄호 병기되는 경우가 많으므로 공연 데이터를 참고할 것.

## Frontend Design Rules

- **No generic layouts.** Every page should feel like one composition, not a dashboard (unless it IS a dashboard).
- **Brand first.** IPCHUN brand must be a hero-level signal, not just nav text.
- **Expressive typography.** Use Noto Serif KR (headings) + Pretendard (body). Never Inter/Roboto/Arial alone.
- **No flat backgrounds.** Use gradients, images, or subtle patterns for atmosphere.
- **No cards by default.** Only use cards when they contain user interaction.
- **One job per section.** Each section = one purpose, one headline, one supporting sentence.
- **Real visual anchors.** Images should show product/place/atmosphere. No decorative-only gradients.
- **Reduce clutter.** No pill clusters, stat strips, icon rows, or competing text blocks.
- **Zero corner radius.** All elements use sharp corners for editorial aesthetic.
- **Always use `$--variable` tokens.** Never hardcode colors.
