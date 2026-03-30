# Web App (Cloudflare Pages) Project Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/web` Next.js 앱을 생성하고, Cloudflare Pages 배포 파이프라인까지 구성한다. 모바일 퍼스트 레이아웃 + 캘린더 + 일정 카드 스크롤 + AdSense 광고 슬롯을 포함한다.

**Architecture:** 모노레포 `apps/web`에 Next.js 16 + Tailwind CSS v4 앱을 추가한다. `@opennextjs/cloudflare`로 Cloudflare Pages에 배포한다. NestJS 서버의 기존 `/schedules/calendar` API와 `/schedules` API를 호출하여 데이터를 표시한다. `@ipchun/shared` 패키지의 타입을 공유한다.

**Tech Stack:** Next.js 16, Tailwind CSS v4, @opennextjs/cloudflare, @ipchun/shared, Google AdSense

---

## File Structure

```
apps/web/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── wrangler.jsonc
├── open-next.config.ts
├── .env.example
├── .gitignore
├── public/
│   └── _headers
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx           ← 모바일 퍼스트 루트 레이아웃 + AdSense
│   │   ├── page.tsx             ← 메인: 캘린더 + 일정 카드 리스트
│   │   └── schedule/
│   │       └── [id]/
│   │           └── page.tsx     ← 일정 상세 페이지
│   ├── lib/
│   │   └── api.ts               ← 서버 API 클라이언트
│   └── components/
│       ├── Calendar.tsx          ← 월별 캘린더 (날짜 선택)
│       ├── ScheduleCard.tsx      ← 일정 카드 컴포넌트
│       ├── ScheduleList.tsx      ← 일정 카드 리스트 (스크롤)
│       └── AdBanner.tsx          ← AdSense 배너 래퍼
```

---

### Task 1: Next.js 프로젝트 초기화 + 의존성 설치

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/.env.example`
- Create: `apps/web/.gitignore`
- Modify: `package.json` (루트 — `dev:web`, `build:web` 스크립트 추가)

- [ ] **Step 1: `apps/web/package.json` 생성**

```json
{
  "name": "@ipchun/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "lint": "eslint"
  },
  "dependencies": {
    "@ipchun/shared": "workspace:*",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@opennextjs/cloudflare": "^1.18.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 2: `apps/web/tsconfig.json` 생성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `apps/web/next.config.ts` 생성**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

- [ ] **Step 4: `apps/web/postcss.config.mjs` 생성**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: `apps/web/.env.example` 생성**

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 6: `apps/web/.gitignore` 생성**

```
.next
.open-next
node_modules
```

- [ ] **Step 7: 루트 `package.json`에 스크립트 추가**

`package.json` (루트)의 `scripts`에 추가:
```json
"dev:web": "pnpm --filter @ipchun/web dev",
"build:web": "pnpm --filter @ipchun/web build"
```

- [ ] **Step 8: 의존성 설치**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm install`
Expected: 성공, `apps/web/node_modules` 생성

- [ ] **Step 9: 커밋**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts apps/web/postcss.config.mjs apps/web/.env.example apps/web/.gitignore package.json pnpm-lock.yaml
git commit -m "feat(web): initialize Next.js project with Cloudflare deps"
```

---

### Task 2: Cloudflare Pages 배포 설정

**Files:**
- Create: `apps/web/wrangler.jsonc`
- Create: `apps/web/open-next.config.ts`
- Create: `apps/web/public/_headers`

- [ ] **Step 1: `apps/web/wrangler.jsonc` 생성**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "ipchun-web",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

- [ ] **Step 2: `apps/web/open-next.config.ts` 생성**

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
```

- [ ] **Step 3: `apps/web/public/_headers` 생성**

```
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

- [ ] **Step 4: 빌드 테스트**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx next build`
Expected: 빌드 성공 (아직 페이지가 없으므로 기본 404만 있을 수 있음 — 에러 없이 완료되면 OK)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/wrangler.jsonc apps/web/open-next.config.ts apps/web/public/_headers
git commit -m "feat(web): add Cloudflare Pages deployment config"
```

---

### Task 3: 글로벌 CSS + 모바일 퍼스트 루트 레이아웃

**Files:**
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: `apps/web/src/app/globals.css` 생성**

admin의 디자인 토큰을 기반으로 하되, 웹 퍼블릭용으로 경량화:

```css
@import "tailwindcss";

:root {
  --background: #FDFCF9;
  --foreground: #1A1A1A;
  --primary: #1A1A1A;
  --primary-foreground: #FFFFFF;
  --secondary: #F5F2ED;
  --secondary-foreground: #1A1A1A;
  --muted: #F5F2ED;
  --muted-foreground: #777777;
  --accent: #E8E5DF;
  --border: #E5E2DC;
  --destructive: #DC2626;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #DC2626;
  --font-heading: "Noto Serif KR", Georgia, serif;
  --font-body: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color-scheme: light;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --font-sans: var(--font-body);
  --font-heading: var(--font-heading);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--secondary);
  color: var(--foreground);
}
```

- [ ] **Step 2: `apps/web/src/app/layout.tsx` 생성**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "입춘 — 인디 공연 일정",
  description: "인디 밴드·아티스트 공연 일정을 한눈에 확인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4 py-3">
            <h1
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              입춘
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-lg">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx next build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): add mobile-first root layout with design tokens"
```

---

### Task 4: API 클라이언트

**Files:**
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: `apps/web/src/lib/api.ts` 생성**

서버의 `/schedules/calendar`와 `/schedules/:id` 엔드포인트를 호출하는 클라이언트:

```typescript
import type { Schedule, ScheduleLineup } from "@ipchun/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface CalendarResponse {
  year: number;
  month: number;
  schedules: (Schedule & {
    lineups: (ScheduleLineup & { artist: { id: string; name: string; imageUrl: string | null } })[];
  })[];
  dates: Record<string, string[]>;
}

export const api = {
  calendar: (year: number, month: number) =>
    request<CalendarResponse>(`/schedules/calendar?year=${year}&month=${month}`),

  schedule: (id: string) =>
    request<
      Schedule & {
        lineups: (ScheduleLineup & { artist: { id: string; name: string; imageUrl: string | null } })[];
      }
    >(`/schedules/${id}`),
};
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add API client for calendar and schedule endpoints"
```

---

### Task 5: Calendar 컴포넌트

**Files:**
- Create: `apps/web/src/components/Calendar.tsx`

- [ ] **Step 1: `apps/web/src/components/Calendar.tsx` 생성**

```tsx
"use client";

import { useState } from "react";

interface CalendarProps {
  year: number;
  month: number;
  dates: Record<string, string[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function Calendar({
  year,
  month,
  dates,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: CalendarProps) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="px-4 py-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 text-muted-foreground"
          aria-label="이전 달"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2
          className="text-base font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {year}년 {month}월
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 text-muted-foreground"
          aria-label="다음 달"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasSchedule = !!dates[dateStr];
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-center py-2 text-sm
                ${isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                ${!isSelected && hasSchedule ? "font-semibold" : ""}
                ${!isSelected && !hasSchedule ? "text-muted-foreground" : ""}
              `}
              style={isSelected ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
            >
              {day}
              {hasSchedule && !isSelected && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/components/Calendar.tsx
git commit -m "feat(web): add Calendar component with month navigation"
```

---

### Task 6: ScheduleCard + ScheduleList 컴포넌트

**Files:**
- Create: `apps/web/src/components/ScheduleCard.tsx`
- Create: `apps/web/src/components/ScheduleList.tsx`

- [ ] **Step 1: `apps/web/src/components/ScheduleCard.tsx` 생성**

```tsx
import Link from "next/link";
import type { Schedule, ScheduleLineup } from "@ipchun/shared";

type ScheduleWithLineups = Schedule & {
  lineups: (ScheduleLineup & {
    artist: { id: string; name: string; imageUrl: string | null };
  })[];
};

const TYPE_LABELS: Record<string, string> = {
  CONCERT: "공연",
  BUSKING: "버스킹",
  FESTIVAL: "페스티벌",
  RELEASE: "발매",
  OTHER: "기타",
};

export function ScheduleCard({ schedule }: { schedule: ScheduleWithLineups }) {
  const date = new Date(schedule.startDate);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayStr = dayNames[date.getDay()];
  const artists = schedule.lineups.map((l) => l.artist.name).join(", ");

  return (
    <Link
      href={`/schedule/${schedule.id}`}
      className="block border-b px-4 py-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {date.getDate()}
          </div>
          <div className="text-xs text-muted-foreground">{dayStr}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {TYPE_LABELS[schedule.type] || schedule.type}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug truncate">
            {schedule.title}
          </h3>
          {artists && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {artists}
            </p>
          )}
          {schedule.location && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              📍 {schedule.location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: `apps/web/src/components/ScheduleList.tsx` 생성**

```tsx
import type { Schedule, ScheduleLineup } from "@ipchun/shared";
import { ScheduleCard } from "./ScheduleCard";

type ScheduleWithLineups = Schedule & {
  lineups: (ScheduleLineup & {
    artist: { id: string; name: string; imageUrl: string | null };
  })[];
};

interface ScheduleListProps {
  schedules: ScheduleWithLineups[];
  selectedDate: string | null;
}

export function ScheduleList({ schedules, selectedDate }: ScheduleListProps) {
  const filtered = selectedDate
    ? schedules.filter((s) => {
        const start = s.startDate.slice(0, 10);
        const end = s.endDate ? s.endDate.slice(0, 10) : start;
        return selectedDate >= start && selectedDate <= end;
      })
    : schedules;

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {selectedDate ? "이 날짜에 일정이 없습니다" : "이번 달 일정이 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((schedule) => (
        <ScheduleCard key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/components/ScheduleCard.tsx apps/web/src/components/ScheduleList.tsx
git commit -m "feat(web): add ScheduleCard and ScheduleList components"
```

---

### Task 7: AdBanner 컴포넌트

**Files:**
- Create: `apps/web/src/components/AdBanner.tsx`

- [ ] **Step 1: `apps/web/src/components/AdBanner.tsx` 생성**

AdSense 슬롯 래퍼. 실제 `data-ad-client`와 `data-ad-slot`은 나중에 교체:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

export function AdBanner({ slot, format = "auto", className }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet — OK in dev
    }
  }, []);

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/components/AdBanner.tsx
git commit -m "feat(web): add AdSense banner wrapper component"
```

---

### Task 8: 메인 페이지 — 캘린더 + 일정 리스트 조합

**Files:**
- Create: `apps/web/src/app/page.tsx`

- [ ] **Step 1: `apps/web/src/app/page.tsx` 생성**

캘린더 + 일정 리스트 + 광고를 하나의 스크롤 페이지로 조합:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/Calendar";
import { ScheduleList } from "@/components/ScheduleList";
import { AdBanner } from "@/components/AdBanner";
import { api, type CalendarResponse } from "@/lib/api";

export default function HomePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.calendar(year, month).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [year, month]);

  const handleChangeMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setSelectedDate(null);
  };

  return (
    <div>
      {/* Calendar */}
      <Calendar
        year={year}
        month={month}
        dates={data?.dates ?? {}}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onChangeMonth={handleChangeMonth}
      />

      {/* Ad slot */}
      <AdBanner slot="CALENDAR_BELOW" className="px-4 py-2" />

      {/* Divider */}
      <div
        className="h-px mx-4"
        style={{ background: "var(--border)" }}
      />

      {/* Schedule list */}
      <div className="pb-8">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : (
          <ScheduleList
            schedules={data?.schedules ?? []}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: dev 서버 확인**

Run: `cd /Users/sanghyeon/projects/ipchun && pnpm dev:web`
Expected: `http://localhost:3001`에서 캘린더와 (API 연결 시) 일정 리스트가 렌더링. API 서버 없이도 빈 캘린더 + "이번 달 일정이 없습니다" 메시지 표시.

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): add main page with calendar + schedule list + ad slot"
```

---

### Task 9: 일정 상세 페이지

**Files:**
- Create: `apps/web/src/app/schedule/[id]/page.tsx`

- [ ] **Step 1: `apps/web/src/app/schedule/[id]/page.tsx` 생성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import type { Schedule, ScheduleLineup } from "@ipchun/shared";

type ScheduleDetail = Schedule & {
  lineups: (ScheduleLineup & {
    artist: { id: string; name: string; imageUrl: string | null };
  })[];
};

const TYPE_LABELS: Record<string, string> = {
  CONCERT: "공연",
  BUSKING: "버스킹",
  FESTIVAL: "페스티벌",
  RELEASE: "발매",
  OTHER: "기타",
};

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.schedule(id).then((res) => {
      setSchedule(res);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        일정을 찾을 수 없습니다
      </div>
    );
  }

  const startDate = new Date(schedule.startDate);
  const formatDate = (d: Date) =>
    `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* Type badge */}
      <div
        className="text-[10px] font-semibold tracking-wider uppercase mb-2"
        style={{ color: "var(--muted-foreground)" }}
      >
        {TYPE_LABELS[schedule.type] || schedule.type}
      </div>

      {/* Title */}
      <h1
        className="text-xl font-bold leading-tight mb-4"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {schedule.title}
      </h1>

      {/* Info */}
      <div className="space-y-2 text-sm mb-6">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-12 flex-shrink-0">날짜</span>
          <span>{formatDate(startDate)}</span>
        </div>
        {schedule.location && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">장소</span>
            <span>{schedule.location}</span>
          </div>
        )}
        {schedule.address && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">주소</span>
            <span>{schedule.address}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {schedule.description && (
        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          {schedule.description}
        </p>
      )}

      {/* Lineup */}
      {schedule.lineups.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            라인업
          </h2>
          <div className="space-y-2">
            {schedule.lineups.map((lineup) => (
              <div
                key={lineup.id}
                className="flex items-center gap-3 py-2 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {lineup.artist.imageUrl ? (
                  <img
                    src={lineup.artist.imageUrl}
                    alt={lineup.artist.name}
                    className="w-8 h-8 object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {lineup.artist.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium">{lineup.artist.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad */}
      <AdBanner slot="DETAIL_BOTTOM" className="mt-4" />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/app/schedule/
git commit -m "feat(web): add schedule detail page with lineup display"
```

---

### Task 10: AdSense 스크립트 + 레이아웃 마무리

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (AdSense `<script>` 태그 추가)

- [ ] **Step 1: `layout.tsx`에 AdSense 스크립트 추가**

`<head>` 안에 추가:
```tsx
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossOrigin="anonymous"
/>
```

`ca-pub-XXXXXXXXXXXXXXXX`는 실제 AdSense 계정 ID로 교체 필요.

- [ ] **Step 2: 빌드 최종 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx next build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): add AdSense script to root layout"
```

---

### Task 11: Cloudflare Pages 배포 테스트

**Files:** (기존 파일만 사용)

- [ ] **Step 1: OpenNext 빌드 확인**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx opennextjs-cloudflare build`
Expected: `.open-next/` 디렉토리 생성, worker.js 및 assets 포함

- [ ] **Step 2: 로컬 프리뷰**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx opennextjs-cloudflare preview`
Expected: Wrangler가 로컬 서버를 띄우고, 브라우저에서 페이지 확인 가능

- [ ] **Step 3: Cloudflare에 배포 (수동)**

Run: `cd /Users/sanghyeon/projects/ipchun/apps/web && npx opennextjs-cloudflare deploy`
Expected: Cloudflare Pages에 배포 완료, URL 출력

> **Note:** 첫 배포 시 `npx wrangler login`으로 Cloudflare 인증 필요. `wrangler.jsonc`의 `name: "ipchun-web"`이 프로젝트명이 됨.
