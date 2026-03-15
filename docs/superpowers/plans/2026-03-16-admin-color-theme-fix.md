# Admin Color Theme Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix admin panel color theme so text and form elements are visible regardless of system dark/light mode setting.

**Architecture:** Admin panel is light-only. Remove dark mode CSS variable override and add explicit `text-gray-900` color tokens to all content elements. Add `color-scheme: light` to force light rendering of native form controls.

**Tech Stack:** Next.js 16, Tailwind CSS v4, CSS custom properties

---

## Root Cause

`globals.css`의 `@media (prefers-color-scheme: dark)` 미디어 쿼리가 `--foreground`를 `#ededed`(밝은 색)로 변경하지만, 메인 컨텐츠 영역은 `bg-gray-50`/`bg-white` 배경을 사용 → 다크 모드 시스템에서 밝은 텍스트 + 밝은 배경 = 텍스트 보이지 않음.

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/admin/src/app/globals.css` | Modify | Remove dark mode override, force light color scheme |
| `apps/admin/src/app/layout.tsx` | Modify | Add explicit text color to main content area |
| `apps/admin/src/app/artists/new/page.tsx` | Modify | Add explicit text/bg colors to form elements |
| `apps/admin/src/app/schedules/new/page.tsx` | Modify | Add explicit text/bg colors to form elements |
| `apps/admin/src/app/page.tsx` | Modify | Add explicit text colors to dashboard cards |
| `apps/admin/src/app/artists/page.tsx` | Verify | Check if explicit colors needed |
| `apps/admin/src/app/schedules/page.tsx` | Verify | Check if explicit colors needed |

---

## Chunk 1: Core Theme Fix

### Task 1: Fix globals.css - Remove dark mode override and force light scheme

**Files:**
- Modify: `apps/admin/src/app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace the entire file with:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  color-scheme: light;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

Changes:
- Remove `@media (prefers-color-scheme: dark)` block entirely
- Add `color-scheme: light` to `:root` to force native form controls to render in light mode

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/globals.css
git commit -m "fix: remove dark mode override from admin globals.css"
```

### Task 2: Add explicit colors to layout main content area

**Files:**
- Modify: `apps/admin/src/app/layout.tsx`

- [ ] **Step 1: Update main element className**

Change line 41:
```tsx
// Before
<main className="flex-1 p-8 bg-gray-50">{children}</main>

// After
<main className="flex-1 p-8 bg-gray-50 text-gray-900">{children}</main>
```

This ensures main content text is always dark regardless of any inherited color.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/app/layout.tsx
git commit -m "fix: add explicit text color to admin main content area"
```

### Task 3: Add explicit colors to form elements across all pages

**Files:**
- Modify: `apps/admin/src/app/artists/new/page.tsx`
- Modify: `apps/admin/src/app/schedules/new/page.tsx`

- [ ] **Step 1: Update artists/new/page.tsx form elements**

Update input/textarea/select classes from:
```
className="w-full border rounded px-3 py-2"
```
to:
```
className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
```

Apply to all `<input>` and `<textarea>` elements in this file (3 total: name input, genre input, description textarea).

- [ ] **Step 2: Update schedules/new/page.tsx form elements**

Same change for all `<input>`, `<textarea>`, and `<select>` elements in this file (8 total: artistId, title, type select, startDate, endDate, location, address inputs + description textarea).

Update classes from:
```
className="w-full border rounded px-3 py-2"
```
to:
```
className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
```

- [ ] **Step 3: Verify dashboard page text colors**

`apps/admin/src/app/page.tsx` - dashboard cards already use `bg-white` and `text-gray-500` which are explicit. The `text-3xl font-bold` inherits from parent which will now be `text-gray-900`. No changes needed.

- [ ] **Step 4: Verify list pages**

`apps/admin/src/app/artists/page.tsx` and `apps/admin/src/app/schedules/page.tsx` - both use `bg-white` cards with `text-gray-500`. The `text-2xl font-bold` headings inherit from parent's `text-gray-900`. No changes needed.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/artists/new/page.tsx apps/admin/src/app/schedules/new/page.tsx
git commit -m "fix: add explicit bg/text/border colors to admin form elements"
```

### Task 4: Visual verification

- [ ] **Step 1: Start the admin dev server and verify**

```bash
cd apps/admin && npm run dev
```

Open `http://localhost:3001/artists/new` in browser and verify:
- Labels ("이름", "장르", "설명") are visible as dark text
- Input fields have visible borders and white background
- Placeholder text is visible
- Button ("등록") is visible with indigo background
- Sidebar remains dark with white text
- Dashboard cards show correctly

- [ ] **Step 2: Test with system dark mode on and off**

Toggle system appearance between light/dark and confirm admin always renders correctly in light mode.
