# ipchun 프로젝트 셋업 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인디 밴드/아티스트 팬 플랫폼(ipchun)을 위한 모노레포 프로젝트 인프라 셋업 — NestJS 서버, React Native Expo 모바일 앱, Next.js 어드민 클라이언트

**Architecture:** pnpm 워크스페이스 기반 모노레포. 서버(NestJS + Prisma + PostgreSQL)는 REST API를 제공하고, 모바일 앱(Expo)은 팬들이 아티스트와 일정을 트래킹하는 용도, 어드민 클라이언트(Next.js)는 아티스트/일정 등록 및 카드뉴스 생성을 위한 내부 관리 도구.

**Tech Stack:** pnpm workspaces, NestJS 11, Prisma 6, PostgreSQL, React Native (Expo SDK 52), expo-router, Next.js 15, Tailwind CSS v4, shadcn/ui

---

## File Structure

```
ipchun/
├── apps/
│   ├── server/                  # NestJS backend API
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   ├── main.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── artist/
│   │   │   │   ├── artist.module.ts
│   │   │   │   ├── artist.controller.ts
│   │   │   │   ├── artist.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-artist.dto.ts
│   │   │   │       └── update-artist.dto.ts
│   │   │   └── schedule/
│   │   │       ├── schedule.module.ts
│   │   │       ├── schedule.controller.ts
│   │   │       ├── schedule.service.ts
│   │   │       └── dto/
│   │   │           ├── create-schedule.dto.ts
│   │   │           └── update-schedule.dto.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   │   └── app.e2e-spec.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   └── nest-cli.json
│   ├── mobile/                  # React Native Expo (팬용 앱)
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── artists.tsx
│   │   │   │   └── schedules.tsx
│   │   │   └── artists/
│   │   │       └── [id].tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── app.json
│   └── admin/                   # Next.js 어드민 클라이언트
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── artists/
│       │   │   │   ├── page.tsx
│       │   │   │   └── new/
│       │   │   │       └── page.tsx
│       │   │   └── schedules/
│       │   │       ├── page.tsx
│       │   │       └── new/
│       │   │           └── page.tsx
│       │   └── lib/
│       │       └── api.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.ts
├── packages/
│   └── shared/                  # 공유 타입 & 상수
│       ├── src/
│       │   ├── index.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .npmrc
├── .prettierrc
├── .gitignore
└── .env.example
```

---

## Chunk 1: Monorepo Infrastructure

### Task 1: Root 모노레포 설정 파일 생성

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `tsconfig.base.json`
- Create: `.env.example`

- [ ] **Step 1: root package.json 생성**

```json
{
  "name": "ipchun",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter @ipchun/server dev",
    "dev:mobile": "pnpm --filter @ipchun/mobile start",
    "dev:admin": "pnpm --filter @ipchun/admin dev",
    "build:server": "pnpm --filter @ipchun/server build",
    "build:admin": "pnpm --filter @ipchun/admin build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.5.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "packageManager": "pnpm@10.6.0"
}
```

- [ ] **Step 2: pnpm-workspace.yaml 생성**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: .npmrc 생성**

Expo와 pnpm 호환성을 위해 `node-linker=hoisted` 설정 필수.

```ini
node-linker=hoisted
strict-peer-dependencies=false
```

- [ ] **Step 4: .gitignore 생성**

```gitignore
# dependencies
node_modules/

# builds
dist/
.next/
.expo/

# environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Misc
*.log
```

- [ ] **Step 5: .prettierrc 생성**

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

- [ ] **Step 6: tsconfig.base.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 7: .env.example 생성**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ipchun?schema=public"

# Server
PORT=3000

# Admin
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

- [ ] **Step 8: pnpm install 실행**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` 파일 생성

- [ ] **Step 9: 커밋**

```bash
git add package.json pnpm-workspace.yaml .npmrc .gitignore .prettierrc tsconfig.base.json .env.example pnpm-lock.yaml
git commit -m "chore: initialize monorepo infrastructure with pnpm workspaces"
```

### Task 2: 공유 타입 패키지 (packages/shared)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: packages/shared/package.json 생성**

```json
{
  "name": "@ipchun/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: packages/shared/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: packages/shared/src/types.ts 생성**

서버·클라이언트 간 공유할 타입 정의.

```typescript
export enum ScheduleType {
  CONCERT = 'CONCERT',
  BUSKING = 'BUSKING',
  FESTIVAL = 'FESTIVAL',
  RELEASE = 'RELEASE',
  OTHER = 'OTHER',
}

export enum CardNewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export interface Artist {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  artistId: string;
  title: string;
  description: string | null;
  type: ScheduleType;
  startDate: string;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardNews {
  id: string;
  scheduleId: string;
  title: string;
  slides: CardNewsSlide[];
  status: CardNewsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CardNewsSlide {
  imageUrl: string;
  caption: string;
  order: number;
}
```

- [ ] **Step 4: packages/shared/src/index.ts 생성**

```typescript
export * from './types';
```

- [ ] **Step 5: pnpm install 실행 및 타입 체크**

```bash
pnpm install
pnpm --filter @ipchun/shared typecheck
```

Expected: 에러 없이 완료

- [ ] **Step 6: 커밋**

```bash
git add packages/ pnpm-lock.yaml
git commit -m "feat: add shared types package with Artist, Schedule, CardNews types"
```

---

## Chunk 2: NestJS Server Setup

### Task 3: NestJS 프로젝트 스캐폴딩

**Files:**
- Create: `apps/server/` (NestJS CLI로 생성)

- [ ] **Step 1: NestJS CLI로 프로젝트 생성**

```bash
cd apps
npx @nestjs/cli new server --skip-install --package-manager pnpm --strict
cd ..
```

- [ ] **Step 2: apps/server/package.json 수정**

`name` 필드를 워크스페이스 이름으로 변경하고, `@ipchun/shared` 의존성 추가.

`name`을 `"@ipchun/server"`로 변경하고 dependencies에 추가:

```json
"@ipchun/shared": "workspace:*"
```

- [ ] **Step 3: apps/server/tsconfig.json 수정**

기존 NestJS CLI가 생성한 tsconfig.json에서 `extends`를 루트 tsconfig.base.json으로 변경:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "incremental": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: pnpm install 및 빌드 확인**

```bash
pnpm install
pnpm --filter @ipchun/server build
```

Expected: 빌드 성공

- [ ] **Step 5: 서버 실행 확인**

```bash
pnpm --filter @ipchun/server start
```

Expected: `Nest application successfully started` 메시지 확인 후 Ctrl+C로 종료

- [ ] **Step 6: 커밋**

```bash
git add apps/server/ pnpm-lock.yaml
git commit -m "feat: scaffold NestJS server in monorepo"
```

### Task 4: Prisma 셋업 및 데이터베이스 스키마

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Modify: `apps/server/package.json` (prisma 의존성 추가)

- [ ] **Step 1: Prisma 의존성 설치**

```bash
pnpm --filter @ipchun/server add prisma @prisma/client
```

- [ ] **Step 2: Prisma 초기화**

```bash
cd apps/server && npx prisma init && cd ../..
```

- [ ] **Step 3: apps/server/prisma/schema.prisma 작성**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Artist {
  id          String     @id @default(uuid())
  name        String
  description String?
  genre       String?
  imageUrl    String?    @map("image_url")
  socialLinks Json?      @map("social_links")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  schedules   Schedule[]

  @@map("artists")
}

model Schedule {
  id          String       @id @default(uuid())
  artistId    String       @map("artist_id")
  artist      Artist       @relation(fields: [artistId], references: [id], onDelete: Cascade)
  title       String
  description String?
  type        ScheduleType
  startDate   DateTime     @map("start_date")
  endDate     DateTime?    @map("end_date")
  location    String?
  address     String?
  imageUrl    String?      @map("image_url")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  cardNews    CardNews[]

  @@map("schedules")
}

model CardNews {
  id         String         @id @default(uuid())
  scheduleId String         @map("schedule_id")
  schedule   Schedule       @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  title      String
  slides     Json
  status     CardNewsStatus @default(DRAFT)
  createdAt  DateTime       @default(now()) @map("created_at")
  updatedAt  DateTime       @updatedAt @map("updated_at")

  @@map("card_news")
}

enum ScheduleType {
  CONCERT
  BUSKING
  FESTIVAL
  RELEASE
  OTHER
}

enum CardNewsStatus {
  DRAFT
  PUBLISHED
}
```

- [ ] **Step 4: apps/server/.env의 DATABASE_URL 확인/수정**

`prisma init`이 자동 생성한 `.env` 파일의 `DATABASE_URL`을 로컬 PostgreSQL에 맞게 수정:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ipchun?schema=public"
```

- [ ] **Step 5: Prisma client 생성 확인**

```bash
cd apps/server && npx prisma generate && cd ../..
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 6: 커밋**

```bash
git add apps/server/prisma/ apps/server/package.json
git commit -m "feat: add Prisma schema with Artist, Schedule, CardNews models"
```

### Task 5: Prisma 서비스 모듈

**Files:**
- Create: `apps/server/src/prisma/prisma.service.ts`
- Create: `apps/server/src/prisma/prisma.module.ts`

- [ ] **Step 1: apps/server/src/prisma/prisma.service.ts 생성**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: apps/server/src/prisma/prisma.module.ts 생성**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: apps/server/src/app.module.ts에 PrismaModule 추가**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: 빌드 확인**

```bash
pnpm --filter @ipchun/server build
```

Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add apps/server/src/prisma/ apps/server/src/app.module.ts
git commit -m "feat: add global Prisma service module"
```

### Task 6: Artist CRUD 모듈

**Files:**
- Create: `apps/server/src/artist/dto/create-artist.dto.ts`
- Create: `apps/server/src/artist/dto/update-artist.dto.ts`
- Create: `apps/server/src/artist/artist.service.ts`
- Create: `apps/server/src/artist/artist.controller.ts`
- Create: `apps/server/src/artist/artist.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: Validation 및 DTO 의존성 설치**

```bash
pnpm --filter @ipchun/server add class-validator class-transformer @nestjs/mapped-types
```

- [ ] **Step 2: apps/server/src/main.ts에 ValidationPipe 추가**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 3: apps/server/src/artist/dto/create-artist.dto.ts 생성**

```typescript
import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;
}
```

- [ ] **Step 4: apps/server/src/artist/dto/update-artist.dto.ts 생성**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateArtistDto } from './create-artist.dto';

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
```

- [ ] **Step 5: apps/server/src/artist/artist.service.ts 생성**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateArtistDto) {
    return this.prisma.artist.create({ data: dto });
  }

  findAll() {
    return this.prisma.artist.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.artist.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateArtistDto) {
    return this.prisma.artist.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.artist.delete({ where: { id } });
  }
}
```

- [ ] **Step 6: apps/server/src/artist/artist.controller.ts 생성**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ArtistService } from './artist.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Controller('artists')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Post()
  create(@Body() dto: CreateArtistDto) {
    return this.artistService.create(dto);
  }

  @Get()
  findAll() {
    return this.artistService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artistService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.artistService.remove(id);
  }
}
```

- [ ] **Step 7: apps/server/src/artist/artist.module.ts 생성**

```typescript
import { Module } from '@nestjs/common';
import { ArtistController } from './artist.controller';
import { ArtistService } from './artist.service';

@Module({
  controllers: [ArtistController],
  providers: [ArtistService],
  exports: [ArtistService],
})
export class ArtistModule {}
```

- [ ] **Step 8: app.module.ts에 ArtistModule import 추가**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';

@Module({
  imports: [PrismaModule, ArtistModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 9: 빌드 확인**

```bash
pnpm --filter @ipchun/server build
```

Expected: 빌드 성공

- [ ] **Step 10: 커밋**

```bash
git add apps/server/src/artist/ apps/server/src/app.module.ts apps/server/src/main.ts apps/server/package.json pnpm-lock.yaml
git commit -m "feat: add Artist CRUD module with validation"
```

### Task 7: Schedule CRUD 모듈

**Files:**
- Create: `apps/server/src/schedule/dto/create-schedule.dto.ts`
- Create: `apps/server/src/schedule/dto/update-schedule.dto.ts`
- Create: `apps/server/src/schedule/schedule.service.ts`
- Create: `apps/server/src/schedule/schedule.controller.ts`
- Create: `apps/server/src/schedule/schedule.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: apps/server/src/schedule/dto/create-schedule.dto.ts 생성**

```typescript
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsNotEmpty } from 'class-validator';
import { ScheduleType } from '@ipchun/shared';

export class CreateScheduleDto {
  @IsUUID()
  artistId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ScheduleType)
  type: ScheduleType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
```

- [ ] **Step 2: apps/server/src/schedule/dto/update-schedule.dto.ts 생성**

```typescript
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ['artistId'] as const),
) {}
```

- [ ] **Step 3: apps/server/src/schedule/schedule.service.ts 생성**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: dto,
      include: { artist: true },
    });
  }

  findAll() {
    return this.prisma.schedule.findMany({
      include: { artist: true },
      orderBy: { startDate: 'asc' },
    });
  }

  findByArtist(artistId: string) {
    return this.prisma.schedule.findMany({
      where: { artistId },
      orderBy: { startDate: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.schedule.findUniqueOrThrow({
      where: { id },
      include: { artist: true },
    });
  }

  update(id: string, dto: UpdateScheduleDto) {
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { artist: true },
    });
  }

  remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: apps/server/src/schedule/schedule.controller.ts 생성**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get()
  findAll(@Query('artistId') artistId?: string) {
    if (artistId) {
      return this.scheduleService.findByArtist(artistId);
    }
    return this.scheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }
}
```

- [ ] **Step 5: apps/server/src/schedule/schedule.module.ts 생성**

```typescript
import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
```

- [ ] **Step 6: app.module.ts에 ScheduleModule import 추가**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistModule } from './artist/artist.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [PrismaModule, ArtistModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: 빌드 확인**

```bash
pnpm --filter @ipchun/server build
```

Expected: 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add apps/server/src/schedule/ apps/server/src/app.module.ts
git commit -m "feat: add Schedule CRUD module with artist relation"
```

### Task 8: 서버 E2E 테스트 (Health Check)

**전제조건:** PostgreSQL이 로컬에서 실행 중이어야 함. PrismaModule이 `@Global()`로 등록되어 있어 앱 부트스트랩 시 DB 연결을 시도합니다.

```bash
# PostgreSQL이 없으면 Docker로 실행:
docker run --name ipchun-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ipchun -p 5432:5432 -d postgres:16

# DB 마이그레이션 적용:
cd apps/server && npx prisma db push && cd ../..
```

**Files:**
- Modify: `apps/server/test/app.e2e-spec.ts`

- [ ] **Step 1: PostgreSQL 실행 확인 및 DB 마이그레이션**

```bash
cd apps/server && npx prisma db push && cd ../..
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 2: 기존 e2e 테스트 실행**

NestJS CLI가 생성한 기본 e2e 테스트를 확인.

```bash
pnpm --filter @ipchun/server test:e2e
```

Expected: health check `GET /` 테스트 통과

- [ ] **Step 3: 커밋 (변경 있을 경우만)**

```bash
git add apps/server/test/
git commit -m "test: verify server health check e2e test passes"
```

---

## Chunk 3: React Native Expo Mobile App

### Task 9: Expo 프로젝트 스캐폴딩

**Files:**
- Create: `apps/mobile/` (Expo CLI로 생성)

- [ ] **Step 1: Expo 프로젝트 생성**

```bash
cd apps
npx create-expo-app@latest mobile --template tabs
cd ..
```

> 만약 `--template tabs` 옵션이 지원되지 않으면 `npx create-expo-app@latest mobile`로 생성 후, expo-router 및 탭 네비게이션을 수동 설정.

- [ ] **Step 2: apps/mobile/package.json의 name 수정**

`name`을 `"@ipchun/mobile"`로 변경.

- [ ] **Step 3: pnpm install**

```bash
pnpm install
```

- [ ] **Step 4: Expo 프로젝트 실행 확인**

```bash
pnpm --filter @ipchun/mobile start
```

Expected: Expo dev server 시작됨. 확인 후 Ctrl+C로 종료.

- [ ] **Step 5: 커밋**

```bash
git add apps/mobile/
git commit -m "feat: scaffold Expo mobile app with tabs template"
```

### Task 10: 모바일 앱 기본 화면 구성

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/artists.tsx`
- Create: `apps/mobile/app/(tabs)/schedules.tsx`
- Create: `apps/mobile/app/artists/[id].tsx`

> Note: tabs 템플릿이 기본 화면 구조를 제공함. 루트 `_layout.tsx`(폰트 로딩, Splash Screen)는 템플릿 생성 그대로 유지. 아래는 탭 구성을 프로젝트에 맞게 수정하는 작업.

- [ ] **Step 1: 탭 레이아웃 수정 — apps/mobile/app/(tabs)/_layout.tsx**

기존 탭을 "홈", "아티스트", "일정" 3개 탭으로 재구성:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6366f1' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="artists"
        options={{
          title: '아티스트',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: '일정',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: 홈 화면 수정 — apps/mobile/app/(tabs)/index.tsx**

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ipchun</Text>
      <Text style={styles.subtitle}>인디 아티스트를 더 가까이</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
});
```

- [ ] **Step 3: 아티스트 탭 화면 생성 — apps/mobile/app/(tabs)/artists.tsx**

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function ArtistsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>아티스트</Text>
      <Text style={styles.empty}>등록된 아티스트가 없습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 4: 일정 탭 화면 생성 — apps/mobile/app/(tabs)/schedules.tsx**

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function SchedulesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>일정</Text>
      <Text style={styles.empty}>등록된 일정이 없습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 5: 아티스트 상세 화면 생성 — apps/mobile/app/artists/[id].tsx**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>아티스트 상세</Text>
      <Text>ID: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
```

- [ ] **Step 6: 불필요한 탭 템플릿 파일 정리**

tabs 템플릿이 생성한 파일 중 아래 파일만 유지하고 나머지를 삭제:
- 유지: `app/_layout.tsx` (루트 레이아웃 — 폰트 로딩, Splash Screen)
- 유지: `app/(tabs)/_layout.tsx` (위 Step 1에서 교체)
- 유지: `app/(tabs)/index.tsx` (위 Step 2에서 교체)
- 삭제 대상: `app/(tabs)/explore.tsx` 등 위에서 생성/수정하지 않은 `(tabs)/` 내 파일, `components/` 내 템플릿 기본 컴포넌트 (ThemedText, ThemedView 등), `constants/` 디렉토리
- 삭제 여부 판단 기준: 위 Step 1~5에서 작성한 코드가 import하지 않는 파일은 삭제

- [ ] **Step 7: 실행 확인**

```bash
pnpm --filter @ipchun/mobile start
```

Expected: 3개 탭(홈, 아티스트, 일정)이 표시되는 Expo 앱

- [ ] **Step 8: 커밋**

```bash
git add apps/mobile/
git commit -m "feat: configure mobile app with home, artists, schedules tabs"
```

---

## Chunk 4: Next.js Admin Client

### Task 11: Next.js 프로젝트 스캐폴딩

**Files:**
- Create: `apps/admin/` (create-next-app으로 생성)

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd apps
npx create-next-app@latest admin --typescript --tailwind --eslint --app --src-dir --use-pnpm --no-import-alias
cd ..
```

- [ ] **Step 2: apps/admin/package.json의 name 수정**

`name`을 `"@ipchun/admin"`로 변경하고, dependencies에 추가:

```json
"@ipchun/shared": "workspace:*"
```

- [ ] **Step 3: pnpm install**

```bash
pnpm install
```

- [ ] **Step 4: Next.js 빌드 확인**

```bash
pnpm --filter @ipchun/admin build
```

Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/
git commit -m "feat: scaffold Next.js admin client with Tailwind CSS"
```

### Task 12: 어드민 레이아웃 및 네비게이션

**Files:**
- Modify: `apps/admin/src/app/layout.tsx`
- Modify: `apps/admin/src/app/page.tsx`
- Create: `apps/admin/src/app/artists/page.tsx`
- Create: `apps/admin/src/app/artists/new/page.tsx`
- Create: `apps/admin/src/app/schedules/page.tsx`
- Create: `apps/admin/src/app/schedules/new/page.tsx`
- Create: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: apps/admin/src/app/layout.tsx — 사이드바 레이아웃**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ipchun Admin',
  description: '인디 아티스트 관리 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen">
        <aside className="w-64 bg-gray-900 text-white p-6">
          <h1 className="text-xl font-bold mb-8">ipchun Admin</h1>
          <nav className="space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              대시보드
            </Link>
            <Link
              href="/artists"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              아티스트
            </Link>
            <Link
              href="/schedules"
              className="block px-4 py-2 rounded hover:bg-gray-800"
            >
              일정
            </Link>
          </nav>
        </aside>
        <main className="flex-1 p-8 bg-gray-50">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: apps/admin/src/app/page.tsx — 대시보드**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">아티스트</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">일정</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">카드뉴스</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: apps/admin/src/lib/api.ts — API 클라이언트**

```typescript
import type { Artist, Schedule } from '@ipchun/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  artists: {
    list: () => request<Artist[]>('/artists'),
    get: (id: string) => request<Artist>(`/artists/${id}`),
    create: (data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<Artist>('/artists', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>>) =>
      request<Artist>(`/artists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/artists/${id}`, { method: 'DELETE' }),
  },
  schedules: {
    list: (artistId?: string) =>
      request<Schedule[]>(
        `/schedules${artistId ? `?artistId=${artistId}` : ''}`,
      ),
    get: (id: string) => request<Schedule>(`/schedules/${id}`),
    create: (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<Schedule>('/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Schedule, 'id' | 'artistId' | 'createdAt' | 'updatedAt'>>) =>
      request<Schedule>(`/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/schedules/${id}`, { method: 'DELETE' }),
  },
};
```

- [ ] **Step 4: apps/admin/src/app/artists/page.tsx — 아티스트 목록**

```tsx
import Link from 'next/link';

export default function ArtistsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">아티스트</h1>
        <Link
          href="/artists/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          새 아티스트 등록
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow">
        <p className="p-8 text-center text-gray-500">
          등록된 아티스트가 없습니다
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: apps/admin/src/app/artists/new/page.tsx — 아티스트 등록 폼**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewArtistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await api.artists.create({
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || null,
        genre: (formData.get('genre') as string) || null,
        imageUrl: null,
        socialLinks: null,
      });
      router.push('/artists');
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">새 아티스트 등록</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이름 *</label>
          <input
            name="name"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">장르</label>
          <input name="genre" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            name="description"
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '등록 중...' : '등록'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: apps/admin/src/app/schedules/page.tsx — 일정 목록**

```tsx
import Link from 'next/link';

export default function SchedulesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">일정</h1>
        <Link
          href="/schedules/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          새 일정 등록
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow">
        <p className="p-8 text-center text-gray-500">
          등록된 일정이 없습니다
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: apps/admin/src/app/schedules/new/page.tsx — 일정 등록 폼**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ScheduleType } from '@ipchun/shared';

const scheduleTypeLabels: Record<ScheduleType, string> = {
  [ScheduleType.CONCERT]: '콘서트',
  [ScheduleType.BUSKING]: '버스킹',
  [ScheduleType.FESTIVAL]: '페스티벌',
  [ScheduleType.RELEASE]: '발매',
  [ScheduleType.OTHER]: '기타',
};

export default function NewSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await api.schedules.create({
        artistId: formData.get('artistId') as string,
        title: formData.get('title') as string,
        type: formData.get('type') as any,
        startDate: formData.get('startDate') as string,
        endDate: (formData.get('endDate') as string) || null,
        location: (formData.get('location') as string) || null,
        address: (formData.get('address') as string) || null,
        description: (formData.get('description') as string) || null,
        imageUrl: null,
      });
      router.push('/schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">새 일정 등록</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            아티스트 ID *
          </label>
          <input
            name="artistId"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="아티스트 목록 페이지에서 ID 확인 (UUID 형식)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            name="title"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">유형 *</label>
          <select
            name="type"
            required
            className="w-full border rounded px-3 py-2"
          >
            {Object.entries(scheduleTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              시작일 *
            </label>
            <input
              name="startDate"
              type="datetime-local"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">종료일</label>
            <input
              name="endDate"
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">장소</label>
          <input
            name="location"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">주소</label>
          <input
            name="address"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            name="description"
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '등록 중...' : '등록'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: .env.example 생성 및 .env.local 복사**

`.env.local`은 `.gitignore`에 포함되므로 커밋하지 않음. `.env.example`을 생성하고 로컬용으로 복사.

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > apps/admin/.env.example
cp apps/admin/.env.example apps/admin/.env.local
```

- [ ] **Step 9: Next.js 빌드 확인**

```bash
pnpm --filter @ipchun/admin build
```

Expected: 빌드 성공

- [ ] **Step 10: 커밋**

```bash
git add apps/admin/src/ apps/admin/.env.example
git commit -m "feat: add admin layout with dashboard, artist, schedule pages"
```

---

## Follow-up Plans (이후 구현 예정)

이 플랜은 프로젝트 셋업만 다룹니다. 이후 별도 플랜으로 구현할 기능들:

1. **아티스트 관리 고도화** — 이미지 업로드, 소셜 링크 관리, 검색/필터
2. **일정 관리 고도화** — 캘린더 뷰, 반복 일정, 알림
3. **카드뉴스 생성** — 일정 기반 카드뉴스 에디터, 이미지 생성
4. **모바일 앱 기능** — 아티스트 팔로우, 일정 알림, 커뮤니티
5. **인증 & 권한** — Admin 로그인, 모바일 사용자 인증
6. **배포** — Docker, CI/CD, 클라우드 배포
