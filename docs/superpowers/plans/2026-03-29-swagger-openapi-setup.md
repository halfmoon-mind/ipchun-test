# Swagger/OpenAPI 문서 자동 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NestJS 서버에 Swagger/OpenAPI 문서를 자동 생성하여 `/api-docs` 경로에서 인터랙티브 API 문서를 제공한다.

**Architecture:** `@nestjs/swagger` CLI 플러그인을 활용해 DTO의 class-validator 데코레이터와 TypeScript 타입으로부터 스키마를 자동 추론한다. 컨트롤러에는 `@ApiTags`, `@ApiOperation`, `@ApiHeader` 데코레이터를 수동 추가하여 문서 품질을 높인다. `@nestjs/mapped-types` → `@nestjs/swagger` 로 import를 변경해 PartialType/OmitType이 swagger 메타데이터를 포함하도록 한다.

**Tech Stack:** `@nestjs/swagger` (NestJS 11 호환), CLI plugin

---

### Task 1: 패키지 설치 및 CLI 플러그인 설정

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/server/nest-cli.json`

- [ ] **Step 1: @nestjs/swagger 패키지 설치**

```bash
cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/server add @nestjs/swagger
```

- [ ] **Step 2: nest-cli.json에 CLI 플러그인 활성화**

`apps/server/nest-cli.json`을 다음과 같이 수정:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

`classValidatorShim: true` — class-validator 데코레이터(`@IsString`, `@IsOptional` 등)로부터 `required`, `type` 등을 자동 추론.
`introspectComments: true` — JSDoc 주석에서 description을 추출.

- [ ] **Step 3: 커밋**

```bash
git add apps/server/package.json apps/server/nest-cli.json pnpm-lock.yaml
git commit -m "feat(server): add @nestjs/swagger package and CLI plugin config"
```

---

### Task 2: SwaggerModule 설정 (main.ts)

**Files:**
- Modify: `apps/server/src/main.ts`

- [ ] **Step 1: main.ts에 Swagger 설정 추가**

`apps/server/src/main.ts`를 다음과 같이 수정:

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(__dirname, '..', envFile) });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IPCHUN API')
    .setDescription('인디 밴드/아티스트 팬 플랫폼 API')
    .setVersion('1.0')
    .addGlobalParameters({
      name: 'x-user-id',
      in: 'header',
      required: false,
      description: '사용자 식별자 (attendance, bookmark 엔드포인트에서 필수)',
      schema: { type: 'string', format: 'uuid' },
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 2: 서버 시작 후 Swagger UI 접속 확인**

```bash
cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/server run start:dev
```

브라우저에서 `http://localhost:3000/api-docs` 접속하여 Swagger UI가 표시되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add apps/server/src/main.ts
git commit -m "feat(server): configure SwaggerModule with DocumentBuilder in main.ts"
```

---

### Task 3: DTO import를 @nestjs/swagger로 변경

`@nestjs/mapped-types`의 `PartialType`, `OmitType`은 swagger 메타데이터를 포함하지 않는다. `@nestjs/swagger`에서 re-export하는 버전으로 교체해야 상속된 DTO도 문서에 정확히 표시된다.

**Files:**
- Modify: `apps/server/src/artist/dto/update-artist.dto.ts`
- Modify: `apps/server/src/schedule/dto/update-schedule.dto.ts`

- [ ] **Step 1: update-artist.dto.ts 수정**

`apps/server/src/artist/dto/update-artist.dto.ts`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateArtistDto } from './create-artist.dto';

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
```

- [ ] **Step 2: update-schedule.dto.ts 수정**

`apps/server/src/schedule/dto/update-schedule.dto.ts`:

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ['artistId'] as const),
) {}
```

- [ ] **Step 3: 서버 빌드 확인**

```bash
cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/server run build
```

빌드 에러 없음을 확인.

- [ ] **Step 4: 커밋**

```bash
git add apps/server/src/artist/dto/update-artist.dto.ts apps/server/src/schedule/dto/update-schedule.dto.ts
git commit -m "refactor(server): switch DTO imports from mapped-types to swagger"
```

---

### Task 4: 컨트롤러에 @ApiTags 데코레이터 추가

각 컨트롤러에 `@ApiTags()`를 추가하여 Swagger UI에서 엔드포인트를 그룹별로 분류한다.

**Files:**
- Modify: `apps/server/src/artist/artist.controller.ts`
- Modify: `apps/server/src/schedule/schedule.controller.ts`
- Modify: `apps/server/src/attendance/attendance.controller.ts`
- Modify: `apps/server/src/bookmark/bookmark.controller.ts`

- [ ] **Step 1: artist.controller.ts**

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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ArtistService } from './artist.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@ApiTags('Artists')
@Controller('artists')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Post()
  @ApiOperation({ summary: '아티스트 생성' })
  create(@Body() dto: CreateArtistDto) {
    return this.artistService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '아티스트 목록 조회' })
  @ApiQuery({ name: 'search', required: false, description: '아티스트 이름 검색' })
  findAll(@Query('search') search?: string) {
    return this.artistService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: '아티스트 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.artistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '아티스트 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '아티스트 삭제' })
  remove(@Param('id') id: string) {
    return this.artistService.remove(id);
  }
}
```

- [ ] **Step 2: schedule.controller.ts**

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
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReplaceLineupsDto } from './dto/replace-lineups.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

@ApiTags('Schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({ summary: '스케줄 생성' })
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: '캘린더 조회 (월별)' })
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.scheduleService.findCalendar({
      year: query.year,
      month: query.month,
      artistId: query.artistId,
    });
  }

  @Get()
  @ApiOperation({ summary: '스케줄 목록 조회' })
  findAll(@Query() query: FindSchedulesQueryDto) {
    if (query.artistId) {
      return this.scheduleService.findByArtist(query.artistId, {
        period: query.period,
        cursor: query.cursor,
        limit: query.limit,
      });
    }
    return this.scheduleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '스케줄 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '스케줄 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '스케줄 삭제' })
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  @Put(':id/lineups')
  @ApiOperation({ summary: '스케줄 라인업 전체 교체' })
  replaceLineups(@Param('id') id: string, @Body() dto: ReplaceLineupsDto) {
    return this.scheduleService.replaceLineups(id, dto.lineups);
  }

  @Delete(':id/lineups/:lineupId')
  @ApiOperation({ summary: '스케줄 라인업 개별 삭제' })
  removeLineup(@Param('id') id: string, @Param('lineupId') lineupId: string) {
    return this.scheduleService.removeLineup(id, lineupId);
  }
}
```

- [ ] **Step 3: attendance.controller.ts**

```typescript
import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { SyncAttendancesDto } from './dto/sync-attendances.dto';
import { ToggleAttendanceDto } from './dto/toggle-attendance.dto';

@ApiTags('Attendances')
@ApiHeader({ name: 'x-user-id', required: true, description: '사용자 식별자 (UUID)' })
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '출석 기록 조회' })
  @ApiQuery({ name: 'scheduleId', required: true, description: '스케줄 ID (UUID)' })
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('scheduleId') scheduleId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!scheduleId) throw new BadRequestException('scheduleId query parameter is required');
    const records = await this.attendanceService.findBySchedule(userId, scheduleId);
    return {
      attendances: records.map((r) => ({
        scheduleId: r.scheduleId,
        date: r.date.toISOString().split('T')[0],
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  @ApiOperation({ summary: '출석 데이터 동기화' })
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncAttendancesDto,
  ) {
    const userId = this.getUserId(headers);
    return this.attendanceService.sync(userId, dto);
  }

  @Put(':scheduleId/:date')
  @ApiOperation({ summary: '출석 토글 (특정 날짜)' })
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('scheduleId') scheduleId: string,
    @Param('date') date: string,
    @Body() dto: ToggleAttendanceDto,
  ) {
    const userId = this.getUserId(headers);
    if (isNaN(Date.parse(date))) throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    return this.attendanceService.toggle(userId, scheduleId, date, dto.checkedAt);
  }
}
```

- [ ] **Step 4: bookmark.controller.ts**

```typescript
import { Controller, Get, Put, Param, Body, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { SyncBookmarksDto } from './dto/sync-bookmarks.dto';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';

@ApiTags('Bookmarks')
@ApiHeader({ name: 'x-user-id', required: true, description: '사용자 식별자 (UUID)' })
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new BadRequestException('x-user-id header is required');
    return userId;
  }

  @Get()
  @ApiOperation({ summary: '북마크 목록 조회' })
  @ApiQuery({ name: 'scheduleId', required: true, description: '스케줄 ID (UUID)' })
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('scheduleId') scheduleId: string,
  ) {
    const userId = this.getUserId(headers);
    if (!scheduleId) throw new BadRequestException('scheduleId query parameter is required');
    const records = await this.bookmarkService.findBySchedule(userId, scheduleId);
    return {
      bookmarks: records.map((r) => ({
        scheduleLineupId: r.scheduleLineupId,
        checkedAt: r.checkedAt.toISOString(),
      })),
    };
  }

  @Put('sync')
  @ApiOperation({ summary: '북마크 데이터 동기화' })
  async sync(
    @Headers() headers: Record<string, string>,
    @Body() dto: SyncBookmarksDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.sync(userId, dto);
  }

  @Put(':lineupId')
  @ApiOperation({ summary: '북마크 토글' })
  async toggle(
    @Headers() headers: Record<string, string>,
    @Param('lineupId') lineupId: string,
    @Body() dto: ToggleBookmarkDto,
  ) {
    const userId = this.getUserId(headers);
    return this.bookmarkService.toggle(userId, lineupId, dto.checkedAt);
  }
}
```

- [ ] **Step 5: 서버 빌드 확인**

```bash
cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/server run build
```

- [ ] **Step 6: 커밋**

```bash
git add apps/server/src/artist/artist.controller.ts apps/server/src/schedule/schedule.controller.ts apps/server/src/attendance/attendance.controller.ts apps/server/src/bookmark/bookmark.controller.ts
git commit -m "feat(server): add Swagger decorators to all controllers"
```

---

### Task 5: DTO에 @ApiProperty 보강 (CLI 플러그인이 추론 못하는 필드)

CLI 플러그인은 대부분 자동 추론하지만, `enum`, `Record<>`, 중첩 배열 타입은 명시적 `@ApiProperty()`가 필요하다.

**Files:**
- Modify: `apps/server/src/schedule/dto/create-schedule.dto.ts`
- Modify: `apps/server/src/artist/dto/create-artist.dto.ts`
- Modify: `apps/server/src/schedule/dto/find-schedules-query.dto.ts`

- [ ] **Step 1: create-schedule.dto.ts — enum 타입 명시**

```typescript
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from '@ipchun/shared';

export class CreateScheduleDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ScheduleType, enumName: 'ScheduleType' })
  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @IsDateString()
  startDate!: string;

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

- [ ] **Step 2: create-artist.dto.ts — Record 타입 명시**

```typescript
import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { instagram: 'https://instagram.com/artist', youtube: 'https://youtube.com/@artist' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsString()
  @IsOptional()
  spotifyId?: string;

  @IsString()
  @IsOptional()
  spotifyUrl?: string;
}
```

- [ ] **Step 3: find-schedules-query.dto.ts — enum 값 명시**

```typescript
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FindSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiProperty({ enum: ['upcoming', 'past'], required: false })
  @IsOptional()
  @IsIn(['upcoming', 'past'])
  period?: 'upcoming' | 'past';

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/server/src/schedule/dto/create-schedule.dto.ts apps/server/src/artist/dto/create-artist.dto.ts apps/server/src/schedule/dto/find-schedules-query.dto.ts
git commit -m "feat(server): add explicit @ApiProperty for enum and Record types in DTOs"
```

---

### Task 6: Swagger UI 동작 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 서버 시작**

```bash
cd /Users/sanghyeon/projects/ipchun && pnpm --filter @ipchun/server run start:dev
```

- [ ] **Step 2: Swagger JSON 엔드포인트 확인**

```bash
curl -s http://localhost:3000/api-docs-json | head -50
```

JSON이 정상 출력되는지 확인. 다음 항목이 포함되어야 함:
- `info.title`: "IPCHUN API"
- `tags`: Artists, Schedules, Attendances, Bookmarks
- `paths`: `/artists`, `/schedules`, `/attendances`, `/bookmarks` 하위 경로들
- `components.schemas`: DTO별 스키마 (CreateArtistDto, CreateScheduleDto 등)

- [ ] **Step 3: 브라우저에서 Swagger UI 확인**

`http://localhost:3000/api-docs` 접속:
- 4개 태그 그룹 표시 확인
- 각 엔드포인트의 request/response 스키마 확인
- "Try it out" 버튼으로 실제 요청 테스트 가능 확인

---

### Task 7: CLAUDE.md 문서 업데이트

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md Tech Stack 테이블에 Swagger 항목 추가**

Tech Stack 테이블에 아래 행을 추가:

```markdown
| API Docs | @nestjs/swagger (OpenAPI 3.0), Swagger UI at `/api-docs` |
```

- [ ] **Step 2: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: add Swagger/OpenAPI info to CLAUDE.md"
```
