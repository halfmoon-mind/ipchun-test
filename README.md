# ipchun

인디 밴드/아티스트 팬 플랫폼 — 아티스트 정보와 공연 일정을 한눈에 트래킹하고, 카드뉴스를 생성·관리하는 서비스입니다.

## 프로젝트 구조

```
ipchun/
├── apps/
│   ├── server/     # NestJS 백엔드 API
│   ├── web/        # Next.js 퍼블릭 웹 (Cloudflare Pages)
│   ├── mobile/     # React Native Expo 모바일 앱 (팬용)
│   └── admin/      # Next.js 어드민 클라이언트 (관리용)
├── packages/
│   └── shared/     # 공유 타입 & 상수
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모노레포 | pnpm workspaces |
| 서버 | NestJS 11, Prisma 7, PostgreSQL |
| 웹 | Next.js 16, Tailwind CSS v4, Cloudflare Pages |
| 모바일 앱 | React Native (Expo SDK 55), expo-router |
| 어드민 | Next.js 16, Tailwind CSS v4 |
| 공통 | TypeScript 5 |

## 시작하기

### 사전 요구사항

- Node.js >= 20
- pnpm (`corepack enable`)
- PostgreSQL

### 설치

```bash
pnpm install
```

### 환경 변수 설정

```bash
cp .env.example .env
cp apps/admin/.env.example apps/admin/.env.local
```

`.env` 파일의 `DATABASE_URL`을 로컬 PostgreSQL에 맞게 수정하세요.

### 데이터베이스 설정

```bash
cd apps/server
npx prisma db push
npx prisma generate
cd ../..
```

### 개발 서버 실행

```bash
# NestJS 서버 (http://localhost:3000)
pnpm dev:server

# Next.js 웹 (http://localhost:3001)
pnpm dev:web

# Expo 모바일 앱
pnpm dev:mobile

# Next.js 어드민 (http://localhost:3002)
pnpm dev:admin
```

## 배포

### 웹 (Cloudflare Pages)

```bash
pnpm deploy:web
```

`ipchun.live`로 배포됩니다. 내부적으로 `@opennextjs/cloudflare`를 사용하여 Next.js를 Cloudflare Workers 형태로 빌드 후 배포합니다.

## API 엔드포인트

### Artists

| Method | Path | 설명 |
|--------|------|------|
| GET | `/artists` | 아티스트 목록 조회 |
| GET | `/artists/:id` | 아티스트 상세 조회 |
| POST | `/artists` | 아티스트 등록 |
| PATCH | `/artists/:id` | 아티스트 수정 |
| DELETE | `/artists/:id` | 아티스트 삭제 |

### Schedules

| Method | Path | 설명 |
|--------|------|------|
| GET | `/schedules` | 일정 목록 조회 |
| GET | `/schedules?artistId=` | 아티스트별 일정 조회 |
| GET | `/schedules/:id` | 일정 상세 조회 |
| POST | `/schedules` | 일정 등록 |
| PATCH | `/schedules/:id` | 일정 수정 |
| DELETE | `/schedules/:id` | 일정 삭제 |

## 데이터 모델

- **Artist** — 아티스트 정보 (이름, 장르, 소셜 링크 등)
- **Schedule** — 공연/행사 일정 (콘서트, 버스킹, 페스티벌, 발매, 기타)
- **CardNews** — 일정 기반 카드뉴스 (슬라이드 구성)
