# Server 배포 가이드

NestJS 서버를 새로운 환경에 배포하는 절차.

## 사전 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | >= 22.0.0 |
| pnpm | >= 10.6.0 |
| PostgreSQL | 16+ (Supabase 사용 중) |

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NODE_ENV` | `production` 설정 시 `.env.production` 로드 | `development` |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | (필수) |
| `PORT` | 서버 포트 | `3001` |

현재 프로덕션 DB는 **Supabase** (AWS AP Northeast 2 - 서울) 사용 중.

### `.env.production` 파일

`prisma.config.ts`는 `NODE_ENV`에 따라 `.env.{NODE_ENV}` 파일을 로드한다.
프로덕션 서버의 `apps/server/` 디렉토리에 `.env.production` 파일이 존재해야 한다.

```bash
# apps/server/.env.production
DATABASE_URL="postgresql://..."
PORT=3001
```

> `.env.production`이 없으면 `prisma migrate deploy` 시 `datasource.url property is required` 에러 발생.

## 배포 절차

### 1. 의존성 설치

```bash
pnpm install
```

### 2. shared 패키지 빌드

서버가 `@ipchun/shared` 패키지에 의존하므로 먼저 빌드해야 한다.

```bash
pnpm --filter @ipchun/shared build
```

### 3. Prisma 클라이언트 생성

```bash
pnpm --filter @ipchun/server exec prisma generate
```

### 4. 데이터베이스 마이그레이션 적용

```bash
# 프로덕션에서는 migrate deploy 사용 (대화형 프롬프트 없음)
NODE_ENV=production pnpm --filter @ipchun/server exec prisma migrate deploy
```

> `migrate dev`는 개발 전용. 프로덕션에서는 반드시 `migrate deploy` 사용.

### 5. 서버 빌드

```bash
pnpm build:server
```

`apps/server/dist/` 디렉토리에 컴파일된 JS가 생성된다.

### 6. 서버 실행

```bash
NODE_ENV=production node apps/server/dist/main.js
```

또는 루트에서:

```bash
pnpm --filter @ipchun/server start:prod
```

## 배포 확인

서버가 정상 기동되면:

- **헬스체크**: `GET /`
- **API 문서**: `GET /api-docs` (Swagger UI)

```bash
curl https://api.ipchun.live/
curl https://api.ipchun.live/api-docs
```

## 전체 배포 원라이너

```bash
pnpm install && \
pnpm --filter @ipchun/shared build && \
pnpm --filter @ipchun/server exec prisma generate && \
NODE_ENV=production pnpm --filter @ipchun/server exec prisma migrate deploy && \
pnpm build:server
```

이후 프로세스 매니저(pm2 등)나 컨테이너로 실행:

```bash
NODE_ENV=production PORT=3001 node apps/server/dist/main.js
```

## 주요 설정 참고

- **CORS**: `origin: true, credentials: true` (모든 origin 허용)
- **Validation**: `whitelist: true, forbidNonWhitelisted: true` (알 수 없는 필드 거부)
- **DB Adapter**: `@prisma/adapter-pg` (Prisma + pg 드라이버 직접 연결)

## 롤백

마이그레이션 문제 발생 시:

```bash
# 직전 마이그레이션으로 롤백 (주의: 데이터 손실 가능)
NODE_ENV=production pnpm --filter @ipchun/server exec prisma migrate resolve --rolled-back <migration_name>
```

코드 롤백은 이전 커밋으로 체크아웃 후 재빌드/재배포.
