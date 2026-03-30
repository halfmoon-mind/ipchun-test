# 일정 라인업 관리 (Schedule Lineup Management) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin 일정 등록 페이지에서 스크래핑된 이미지를 OCR로 분석하여 라인업/타임테이블을 추출하고, 편집하여 일정과 함께 저장할 수 있게 한다.

**Architecture:** 서버에 라인업 bulk CRUD 엔드포인트(`PUT /schedules/:id/lineups`)와 아티스트 검색(`GET /artists?search=`)을 추가한다. Admin 일정 등록 페이지에 라인업 섹션을 추가하여 스크래핑 이미지 → OCR 추출 → 라인업 테이블 편집 → 일정 생성 후 라인업 저장 흐름을 완성한다.

**Tech Stack:** NestJS (서버), Next.js + React (Admin UI), Prisma ORM, Gemini Vision API (기존 OCR)

---

## 현재 상태

- **DB**: `ScheduleLineup` 테이블 존재 (scheduleId, artistId, stageName, startTime, endTime, performanceOrder)
- **서버**: Schedule 생성 시 단일 artistId만 연결. 라인업 전용 CRUD 없음. 아티스트 검색 없음.
- **Admin**: 일정 등록 페이지에 URL 스크래핑 + 기본 폼만 있음. 라인업 UI 없음.
- **OCR API**: `/api/ocr-lineup` 준비됨 (Gemini 2.0 Flash). `api.ocr.lineup()` 클라이언트 메서드 있음.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/server/src/schedule/dto/replace-lineups.dto.ts` | 라인업 bulk 교체 DTO |
| Modify | `apps/server/src/schedule/schedule.controller.ts` | 라인업 엔드포인트 추가 |
| Modify | `apps/server/src/schedule/schedule.service.ts` | 라인업 bulk 교체 + 개별 삭제 로직 |
| Modify | `apps/server/src/artist/artist.controller.ts` | 아티스트 검색 쿼리 파라미터 |
| Modify | `apps/server/src/artist/artist.service.ts` | 이름 검색 로직 |
| Modify | `apps/admin/src/lib/api.ts` | 라인업 API + 아티스트 검색 메서드 |
| Create | `apps/admin/src/app/schedules/new/lineup-section.tsx` | 라인업 OCR + 편집 UI 컴포넌트 |
| Modify | `apps/admin/src/app/schedules/new/page.tsx` | 라인업 섹션 통합 + 생성 후 라인업 저장 |

---

## Chunk 1: 서버 — 라인업 CRUD + 아티스트 검색

### Task 1: 라인업 bulk 교체 DTO

**Files:**
- Create: `apps/server/src/schedule/dto/replace-lineups.dto.ts`

- [ ] **Step 1: DTO 파일 생성**

```typescript
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, ValidateNested, IsNotEmpty } from 'class-validator';

export class LineupEntryDto {
  @IsUUID()
  artistId!: string;

  @IsString()
  @IsOptional()
  stageName?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsInt()
  @IsOptional()
  performanceOrder?: number;
}

export class ReplaceLineupsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupEntryDto)
  lineups!: LineupEntryDto[];
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/schedule/dto/replace-lineups.dto.ts
git commit -m "feat(server): add ReplaceLineupsDto for bulk lineup management"
```

---

### Task 2: 서버 라인업 서비스 + 컨트롤러

**Files:**
- Modify: `apps/server/src/schedule/schedule.service.ts`
- Modify: `apps/server/src/schedule/schedule.controller.ts`

- [ ] **Step 1: schedule.service.ts에 replaceLineups, removeLineup 메서드 추가**

서비스 클래스 끝에 다음 메서드 2개 추가:

```typescript
async replaceLineups(scheduleId: string, lineups: { artistId: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number }[]) {
  return this.prisma.$transaction(async (tx) => {
    // 기존 라인업 전부 삭제
    await tx.scheduleLineup.deleteMany({ where: { scheduleId } });
    // 새 라인업 생성
    if (lineups.length > 0) {
      await tx.scheduleLineup.createMany({
        data: lineups.map((l) => ({
          scheduleId,
          artistId: l.artistId,
          stageName: l.stageName || null,
          startTime: l.startTime ? new Date(l.startTime) : null,
          endTime: l.endTime ? new Date(l.endTime) : null,
          performanceOrder: l.performanceOrder ?? null,
        })),
      });
    }
    return tx.schedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: SCHEDULE_INCLUDE,
    });
  });
}

removeLineup(scheduleId: string, lineupId: string) {
  return this.prisma.scheduleLineup.delete({
    where: { id: lineupId, scheduleId },
  });
}
```

- [ ] **Step 2: schedule.controller.ts에 라인업 엔드포인트 추가**

컨트롤러 클래스 끝에 다음 2개 엔드포인트 추가. 상단 import에 `ReplaceLineupsDto` 추가:

```typescript
import { ReplaceLineupsDto } from './dto/replace-lineups.dto';

// 클래스 안에 추가:
@Put(':id/lineups')
replaceLineups(@Param('id') id: string, @Body() dto: ReplaceLineupsDto) {
  return this.scheduleService.replaceLineups(id, dto.lineups);
}

@Delete(':id/lineups/:lineupId')
removeLineup(@Param('id') id: string, @Param('lineupId') lineupId: string) {
  return this.scheduleService.removeLineup(id, lineupId);
}
```

컨트롤러 상단 import에 `Put` 추가:

```typescript
import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, Put,
} from '@nestjs/common';
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schedule/schedule.service.ts apps/server/src/schedule/schedule.controller.ts
git commit -m "feat(server): add lineup bulk replace and delete endpoints"
```

---

### Task 3: 아티스트 이름 검색 기능

**Files:**
- Modify: `apps/server/src/artist/artist.controller.ts`
- Modify: `apps/server/src/artist/artist.service.ts`

OCR로 추출한 아티스트 이름을 DB에서 매칭하려면 검색이 필요하다.

- [ ] **Step 1: artist.service.ts에 search 메서드 추가**

```typescript
findAll(search?: string) {
  return this.prisma.artist.findMany({
    where: search
      ? { name: { contains: search, mode: 'insensitive' } }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });
}
```

기존 `findAll()` 메서드를 위 코드로 교체한다 (search 파라미터를 optional로 추가).

- [ ] **Step 2: artist.controller.ts에 search 쿼리 파라미터 추가**

현재 컨트롤러의 `findAll` 메서드를 확인 후, `@Query('search') search?: string`을 추가:

```typescript
@Get()
findAll(@Query('search') search?: string) {
  return this.artistService.findAll(search);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/artist/artist.service.ts apps/server/src/artist/artist.controller.ts
git commit -m "feat(server): add artist name search query parameter"
```

---

## Chunk 2: Admin API 클라이언트 + 라인업 UI

### Task 4: Admin API 클라이언트에 라인업 + 아티스트 검색 메서드 추가

**Files:**
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: api 객체 수정**

`schedules` 객체에 라인업 메서드 추가, `artists` 객체에 검색 파라미터 추가:

```typescript
// artists.list 수정:
artists: {
  list: (search?: string) =>
    request<Artist[]>(
      `/artists${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  // ... 나머지 기존 메서드 유지
},

// schedules 객체에 추가:
schedules: {
  // ... 기존 메서드 유지
  replaceLineups: (scheduleId: string, lineups: Array<{
    artistId: string;
    stageName?: string;
    startTime?: string;
    endTime?: string;
    performanceOrder?: number;
  }>) =>
    request<Schedule>(`/schedules/${scheduleId}/lineups`, {
      method: 'PUT',
      body: JSON.stringify({ lineups }),
    }),
  removeLineup: (scheduleId: string, lineupId: string) =>
    request<void>(`/schedules/${scheduleId}/lineups/${lineupId}`, {
      method: 'DELETE',
    }),
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat(admin): add lineup CRUD and artist search to API client"
```

---

### Task 5: 라인업 섹션 컴포넌트

**Files:**
- Create: `apps/admin/src/app/schedules/new/lineup-section.tsx`

스크래핑 이미지 그리드 → OCR 추출 → 라인업 테이블 편집을 담당하는 독립 컴포넌트.

- [ ] **Step 1: lineup-section.tsx 생성**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';
import type { ExtractedLineup } from '@/app/api/ocr-lineup/route';

export interface LineupEntry {
  artistName: string;
  artistId: string;    // DB에서 매칭된 아티스트 ID (빈 문자열이면 미매칭)
  stageName: string;
  startTime: string;
  endTime: string;
  performanceOrder: number | null;
}

interface LineupSectionProps {
  images: string[];
  lineups: LineupEntry[];
  onLineupsChange: (lineups: LineupEntry[]) => void;
}

export default function LineupSection({ images, lineups, onLineupsChange }: LineupSectionProps) {
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [artistCache, setArtistCache] = useState<Artist[]>([]);

  // 아티스트 목록 캐싱 (최초 1회)
  useEffect(() => {
    api.artists.list().then(setArtistCache).catch(() => {});
  }, []);

  function toggleImage(url: string) {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }

  function findArtistId(name: string): string {
    const normalized = name.trim().toLowerCase();
    const match = artistCache.find(
      (a) => a.name.toLowerCase() === normalized,
    );
    return match?.id || '';
  }

  async function handleExtract() {
    if (selectedImages.length === 0) return;
    setExtracting(true);
    setError(null);
    try {
      const { lineup } = await api.ocr.lineup(selectedImages);
      const entries: LineupEntry[] = lineup.map((l: ExtractedLineup) => ({
        artistName: l.artistName,
        artistId: findArtistId(l.artistName),
        stageName: l.stageName || '',
        startTime: l.startTime || '',
        endTime: l.endTime || '',
        performanceOrder: l.performanceOrder,
      }));
      onLineupsChange([...lineups, ...entries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR 추출에 실패했습니다');
    } finally {
      setExtracting(false);
    }
  }

  function updateEntry(index: number, field: keyof LineupEntry, value: string | number | null) {
    const updated = [...lineups];
    updated[index] = { ...updated[index], [field]: value };
    onLineupsChange(updated);
  }

  function removeEntry(index: number) {
    onLineupsChange(lineups.filter((_, i) => i !== index));
  }

  function addEmptyEntry() {
    onLineupsChange([
      ...lineups,
      { artistName: '', artistId: '', stageName: '', startTime: '', endTime: '', performanceOrder: null },
    ]);
  }

  if (images.length === 0 && lineups.length === 0) return null;

  return (
    <div className="max-w-xl mt-8 p-4 border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">라인업 / 타임테이블</h2>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* 이미지 선택 그리드 */}
      {images.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            라인업이 포함된 이미지를 선택한 후 OCR 추출 버튼을 눌러주세요.
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {images.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => toggleImage(url)}
                className={`relative border-2 rounded overflow-hidden aspect-square ${
                  selectedImages.includes(url)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {selectedImages.includes(url) && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || selectedImages.length === 0}
            className="btn-primary"
          >
            {extracting ? 'OCR 추출 중...' : `선택한 이미지에서 라인업 추출 (${selectedImages.length}장)`}
          </button>
        </div>
      )}

      {/* 라인업 테이블 */}
      {lineups.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">아티스트</th>
                <th className="py-2 pr-2">매칭</th>
                <th className="py-2 pr-2">스테이지</th>
                <th className="py-2 pr-2">시작</th>
                <th className="py-2 pr-2">종료</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lineups.map((entry, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.artistName}
                      onChange={(e) => updateEntry(i, 'artistName', e.target.value)}
                      className="form-input py-1 text-sm"
                      placeholder="아티스트명"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={entry.artistId}
                      onChange={(e) => updateEntry(i, 'artistId', e.target.value)}
                      className={`form-input py-1 text-sm ${!entry.artistId ? 'text-red-400' : ''}`}
                    >
                      <option value="">미매칭</option>
                      {artistCache.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.stageName}
                      onChange={(e) => updateEntry(i, 'stageName', e.target.value)}
                      className="form-input py-1 text-sm w-20"
                      placeholder="스테이지"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.startTime}
                      onChange={(e) => updateEntry(i, 'startTime', e.target.value)}
                      className="form-input py-1 text-sm w-16"
                      placeholder="HH:mm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.endTime}
                      onChange={(e) => updateEntry(i, 'endTime', e.target.value)}
                      className="form-input py-1 text-sm w-16"
                      placeholder="HH:mm"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addEmptyEntry}
        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
      >
        + 라인업 수동 추가
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/schedules/new/lineup-section.tsx
git commit -m "feat(admin): add LineupSection component with OCR + edit table"
```

---

### Task 6: 일정 등록 페이지에 라인업 섹션 통합

**Files:**
- Modify: `apps/admin/src/app/schedules/new/page.tsx`

기존 폼에 라인업 섹션을 추가하고, 일정 생성 후 라인업을 저장하는 흐름을 완성한다.

- [ ] **Step 1: state + import 추가**

파일 상단에 import 추가:

```tsx
import LineupSection, { type LineupEntry } from './lineup-section';
```

기존 state 선언 아래에 추가:

```tsx
const [scrapedImages, setScrapedImages] = useState<string[]>([]);
const [lineups, setLineups] = useState<LineupEntry[]>([]);
```

- [ ] **Step 2: handleScrape에서 images 저장**

`handleScrape` 함수에서 스크래핑 성공 후 images를 저장하도록 추가:

```tsx
// handleScrape 함수의 try 블록 끝에 추가:
if (data.images && data.images.length > 0) {
  setScrapedImages(data.images);
}
```

- [ ] **Step 3: handleSubmit에서 라인업 저장**

`handleSubmit` 함수를 수정하여 일정 생성 후 라인업도 저장:

```tsx
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    const schedule = await api.schedules.create({
      title,
      type,
      startDate,
      endDate: endDate || null,
      location: location || null,
      address: address || null,
      description: description || null,
      imageUrl: imageUrl || null,
    } as Parameters<typeof api.schedules.create>[0]);

    // 매칭된 라인업이 있으면 저장
    const matchedLineups = lineups.filter((l) => l.artistId);
    if (matchedLineups.length > 0) {
      await api.schedules.replaceLineups(
        schedule.id,
        matchedLineups.map((l, i) => ({
          artistId: l.artistId,
          stageName: l.stageName || undefined,
          startTime: l.startTime || undefined,
          endTime: l.endTime || undefined,
          performanceOrder: l.performanceOrder ?? i + 1,
        })),
      );
    }

    router.push('/schedules');
  } catch (err) {
    setError(err instanceof Error ? err.message : '등록에 실패했습니다');
  } finally {
    setLoading(false);
  }
}
```

참고: 기존 `artistId` state와 관련 input은 제거한다. 라인업 섹션이 이 역할을 대체한다.

- [ ] **Step 4: JSX에 LineupSection 배치**

폼의 `</form>` 직전, 등록 버튼 위에 라인업 섹션 추가:

```tsx
{/* 설명 textarea 아래, 등록 버튼 위에 추가 */}
<LineupSection
  images={scrapedImages}
  lineups={lineups}
  onLineupsChange={setLineups}
/>
```

그리고 기존 "아티스트 ID *" input 블록을 제거한다 (라인업 섹션이 대체).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/schedules/new/page.tsx
git commit -m "feat(admin): integrate lineup section into schedule creation page"
```

---

## 확장 가능성 (향후)

- **일정 편집 페이지**: `/schedules/:id/edit`에서도 라인업 관리 가능하게
- **라인업 순서 드래그앤드롭**: performanceOrder를 드래그로 변경
- **아티스트 자동 생성**: OCR에서 매칭 안 되는 아티스트를 바로 DB에 등록하는 기능
