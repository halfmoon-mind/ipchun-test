# Mobile Design System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tamagui 기반 디자인 시스템을 ipchun 모바일 앱에 통합하여 Apple 미니멀리즘 철학과 HCI 원칙을 따르는 일관된 UI를 구축한다.

**Architecture:** `src/design-system/`에 Tamagui 토큰, 테마, 폰트 설정을 정의. `TamaguiProvider`가 루트 레이아웃에서 앱 전체를 감싼다. 기존 화면은 React Native StyleSheet에서 Tamagui 컴포넌트(`YStack`, `XStack`, `Text` 등) + 테마 토큰으로 마이그레이션.

**Tech Stack:** Tamagui, Expo SDK 55, React Native 0.83.2, Pretendard font, expo-font, expo-router

**Spec:** `docs/superpowers/specs/2026-03-11-mobile-design-system.md`

---

## Compatibility Note

- **Tamagui**: 최신 안정 버전 사용 (설치 시 호환성 확인)
- **React 19 + RN 0.83 (New Architecture)**: Tamagui v2가 Fabric 렌더러와 호환되는지 설치 후 검증 필요
- Expo SDK 55에는 `babel.config.js`가 없음 — Tamagui는 babel 플러그인 없이도 동작하므로 초기엔 생략. 성능 최적화 필요시 추후 추가.

## File Structure

```
apps/mobile/
├── src/design-system/
│   ├── tokens.ts            # createTokens — 색상, 스페이싱, 라디우스, 사이즈
│   ├── motion.ts            # 모션 상수 — duration, easing
│   ├── themes.ts            # 다크/라이트 테마 매핑
│   ├── tamagui.config.ts    # createTamagui — 토큰 + 테마 + 폰트 통합
│   └── index.ts             # re-export + 타입 선언
├── assets/fonts/
│   ├── Pretendard-Regular.otf    # (new)
│   ├── Pretendard-SemiBold.otf   # (new)
│   └── Pretendard-Bold.otf       # (new)
├── app/
│   ├── _layout.tsx              # (modify) TamaguiProvider 래핑, Pretendard 로딩
│   ├── (tabs)/_layout.tsx       # (modify) 테마 색상 적용
│   ├── (tabs)/index.tsx         # (modify) Tamagui 컴포넌트 마이그레이션
│   ├── (tabs)/artists.tsx       # (modify) Tamagui 컴포넌트 마이그레이션
│   ├── (tabs)/schedules.tsx     # (modify) Tamagui 컴포넌트 마이그레이션
│   └── artists/[id].tsx         # (modify) Tamagui 컴포넌트 마이그레이션
└── package.json                 # (modify) Tamagui 의존성 추가
```

---

## Chunk 1: Foundation (Tamagui 설치 + 디자인 토큰)

### Task 1: Install Tamagui Dependencies

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install Tamagui core package**

```bash
cd apps/mobile && pnpm add tamagui
```

`tamagui` — 코어 라이브러리 (컴포넌트 + 스타일링 엔진 + createTokens/createFont/createTamagui 포함)

참고: `@tamagui/config`는 설치하지 않음 — 모든 토큰, 테마, 폰트를 직접 정의하므로 불필요.

- [ ] **Step 2: Verify installation and React 19 compatibility**

```bash
cd apps/mobile && pnpm list tamagui
```

Expected: tamagui 버전 출력. 설치 시 React 19 peer dependency 관련 경고가 나오면 `--legacy-peer-deps` 또는 호환 가능한 버전을 명시.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add tamagui dependencies"
```

---

### Task 2: Add Pretendard Fonts

**Files:**
- Create: `apps/mobile/assets/fonts/Pretendard-Regular.otf`
- Create: `apps/mobile/assets/fonts/Pretendard-SemiBold.otf`
- Create: `apps/mobile/assets/fonts/Pretendard-Bold.otf`

- [ ] **Step 1: Download Pretendard font files**

Pretendard GitHub 릴리즈(https://github.com/orioncactus/pretendard/releases)에서 다운로드.
`Pretendard-Regular.otf`, `Pretendard-SemiBold.otf`, `Pretendard-Bold.otf` 3개 파일을 `apps/mobile/assets/fonts/`에 배치.

- [ ] **Step 2: Verify font files exist**

```bash
ls -la apps/mobile/assets/fonts/Pretendard*
```

Expected: 3개 .otf 파일 나열

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/assets/fonts/Pretendard*
git commit -m "chore(mobile): add Pretendard font files (Regular, SemiBold, Bold)"
```

---

### Task 3: Create Design Tokens

**Files:**
- Create: `apps/mobile/src/design-system/tokens.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p apps/mobile/src/design-system
```

- [ ] **Step 2: Write tokens.ts**

```typescript
// apps/mobile/src/design-system/tokens.ts
import { createTokens } from 'tamagui';

export const tokens = createTokens({
  color: {
    // Background layers (Apple dark mode)
    bg: '#000000',
    bgElevated: '#1C1C1E',
    bgNested: '#2C2C2E',

    // Background layers (Light mode)
    bgLight: '#FFFFFF',
    bgElevatedLight: '#F2F2F7',
    bgNestedLight: '#E5E5EA',

    // Text (Dark)
    textPrimary: 'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.60)',
    textTertiary: 'rgba(255,255,255,0.32)',

    // Text (Light)
    textPrimaryLight: 'rgba(0,0,0,0.88)',
    textSecondaryLight: 'rgba(0,0,0,0.56)',
    textTertiaryLight: 'rgba(0,0,0,0.36)', // 0.28 → 0.36 for WCAG AA (3:1 대형 텍스트)

    // Accent (Gold)
    accent: '#F5A623',
    accentSubtle: 'rgba(245,166,35,0.14)',
    accentPressed: '#D48E1F',
    accentDisabled: 'rgba(245,166,35,0.32)',
    accentLight: '#D4910E',

    // Accent (Gold - Light mode variants)
    accentSubtleLight: 'rgba(212,145,14,0.10)',
    accentPressedLight: '#B87A0A',
    accentDisabledLight: 'rgba(212,145,14,0.32)',

    // Interactive surfaces
    surfacePressed: 'rgba(255,255,255,0.06)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    surfacePressedLight: 'rgba(0,0,0,0.04)',
    surfaceHoverLight: 'rgba(0,0,0,0.02)',

    // Separators
    separator: 'rgba(255,255,255,0.08)',
    separatorOpaque: '#38383A',
    separatorLight: 'rgba(0,0,0,0.08)',

    // Semantic
    negative: '#FF453A',
    positive: '#30D158',
    warning: '#FFD60A',

    // Utility
    transparent: 'transparent',
  },

  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 16, // default spacing
  },

  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    touchMinHeight: 44,
    buttonHeight: 50,
    inputHeight: 48,
    true: 44, // default size
  },

  radius: {
    0: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
    true: 12, // default radius
  },

  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    5: 500,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit src/design-system/tokens.ts 2>&1 | head -5
```

Expected: 에러 없음 (또는 tamagui 관련 import만 확인)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/design-system/tokens.ts
git commit -m "feat(mobile): add design system tokens (colors, spacing, radius, sizes)"
```

---

### Task 4: Create Motion Constants

**Files:**
- Create: `apps/mobile/src/design-system/motion.ts`

- [ ] **Step 1: Write motion.ts**

Tamagui의 `createTokens`는 모션 값을 지원하지 않으므로 별도 상수로 내보낸다.

```typescript
// apps/mobile/src/design-system/motion.ts

/** Animation duration constants (ms) */
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/** Apple-standard easing curve */
export const easing = [0.25, 0.1, 0.25, 1] as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/design-system/motion.ts
git commit -m "feat(mobile): add motion constants (duration, easing)"
```

---

### Task 5: Create Themes

**Files:**
- Create: `apps/mobile/src/design-system/themes.ts`

- [ ] **Step 1: Write themes.ts**

```typescript
// apps/mobile/src/design-system/themes.ts
import { tokens } from './tokens';

export const darkTheme = {
  background: tokens.color.bg,
  backgroundHover: tokens.color.surfaceHover,
  backgroundPress: tokens.color.surfacePressed,
  backgroundFocus: tokens.color.surfaceHover,

  color: tokens.color.textPrimary,
  colorHover: tokens.color.textPrimary,
  colorPress: tokens.color.textPrimary,

  borderColor: tokens.color.separator,
  borderColorHover: tokens.color.separatorOpaque,
  borderColorPress: tokens.color.separatorOpaque,
  borderColorFocus: tokens.color.accent,

  placeholderColor: tokens.color.textTertiary,
  shadowColor: 'rgba(0,0,0,0.5)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondary,
  colorTertiary: tokens.color.textTertiary,
  backgroundElevated: tokens.color.bgElevated,
  backgroundNested: tokens.color.bgNested,
  accentColor: tokens.color.accent,
  accentColorSubtle: tokens.color.accentSubtle,
  accentColorPress: tokens.color.accentPressed,
  accentColorDisabled: tokens.color.accentDisabled,
  separatorColor: tokens.color.separator,
  negativeColor: tokens.color.negative,
  positiveColor: tokens.color.positive,
  warningColor: tokens.color.warning,
} as const;

export const lightTheme = {
  background: tokens.color.bgLight,
  backgroundHover: tokens.color.surfaceHoverLight,
  backgroundPress: tokens.color.surfacePressedLight,
  backgroundFocus: tokens.color.surfaceHoverLight,

  color: tokens.color.textPrimaryLight,
  colorHover: tokens.color.textPrimaryLight,
  colorPress: tokens.color.textPrimaryLight,

  borderColor: tokens.color.separatorLight,
  borderColorHover: tokens.color.separatorLight,
  borderColorPress: tokens.color.separatorLight,
  borderColorFocus: tokens.color.accentLight,

  placeholderColor: tokens.color.textTertiaryLight,
  shadowColor: 'rgba(0,0,0,0.1)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondaryLight,
  colorTertiary: tokens.color.textTertiaryLight,
  backgroundElevated: tokens.color.bgElevatedLight,
  backgroundNested: tokens.color.bgNestedLight,
  accentColor: tokens.color.accentLight,
  accentColorSubtle: tokens.color.accentSubtleLight,
  accentColorPress: tokens.color.accentPressedLight,
  accentColorDisabled: tokens.color.accentDisabledLight,
  separatorColor: tokens.color.separatorLight,
  negativeColor: tokens.color.negative,
  positiveColor: tokens.color.positive,
  warningColor: tokens.color.warning,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/design-system/themes.ts
git commit -m "feat(mobile): add dark and light theme definitions"
```

---

### Task 6: Create Tamagui Config

**Files:**
- Create: `apps/mobile/src/design-system/tamagui.config.ts`
- Create: `apps/mobile/src/design-system/index.ts`

- [ ] **Step 1: Write tamagui.config.ts**

```typescript
// apps/mobile/src/design-system/tamagui.config.ts
import { createFont, createTamagui } from 'tamagui';
import { tokens } from './tokens';
import { darkTheme, lightTheme } from './themes';

const pretendardFont = createFont({
  family: 'Pretendard',
  size: {
    caption: 13,
    subhead: 15,
    body: 17,
    headline: 17,
    title: 22,
    largeTitle: 34,
    true: 17, // default
  },
  weight: {
    caption: '400',
    subhead: '400',
    body: '400',
    headline: '600',
    title: '700',
    largeTitle: '700',
    true: '400', // default
  },
  lineHeight: {
    caption: 18,
    subhead: 20,
    body: 22,
    headline: 22,
    title: 28,
    largeTitle: 41,
    true: 22,
  },
  letterSpacing: {
    caption: 0,
    subhead: 0,
    body: 0,
    headline: 0,
    title: 0.35,
    largeTitle: 0.37,
    true: 0,
  },
  face: {
    400: { normal: 'Pretendard-Regular' },
    600: { normal: 'Pretendard-SemiBold' },
    700: { normal: 'Pretendard-Bold' },
  },
});

const config = createTamagui({
  tokens,
  themes: {
    dark: darkTheme,
    light: lightTheme,
  },
  fonts: {
    body: pretendardFont,
    heading: pretendardFont,
  },
  defaultFont: 'body',
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
```

- [ ] **Step 2: Write index.ts**

```typescript
// apps/mobile/src/design-system/index.ts
export { tokens } from './tokens';
export { duration, easing } from './motion';
export { darkTheme, lightTheme } from './themes';
export { default as tamaguiConfig } from './tamagui.config';
export type { AppConfig } from './tamagui.config';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/design-system/tamagui.config.ts apps/mobile/src/design-system/index.ts
git commit -m "feat(mobile): add tamagui config with Pretendard font and theme setup"
```

---

## Chunk 2: Integration (Provider 연결 + 화면 마이그레이션)

### Task 7: Integrate TamaguiProvider in Root Layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Update _layout.tsx**

Replace the entire file content with:

```typescript
// apps/mobile/app/_layout.tsx
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import tamaguiConfig from '@/src/design-system/tamagui.config';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <Theme name={colorScheme === 'light' ? 'light' : 'dark'}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </Theme>
    </TamaguiProvider>
  );
}
```

참고:
- `SpaceMono` 폰트 로딩 제거 (Pretendard로 대체)
- `useColorScheme()`으로 시스템 다크/라이트 모드 감지
- `defaultTheme="dark"` — 다크 모드 기본

- [ ] **Step 2: Verify app starts without errors**

```bash
cd apps/mobile && npx expo start --clear
```

Expected: 앱이 에러 없이 시작됨. Metro 번들링 성공.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): integrate TamaguiProvider with dark-first theme and Pretendard fonts"
```

---

### Task 8: Update Tab Layout with Design System

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Update tab layout with theme colors**

Replace the entire file content with:

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.colorTertiary.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.separatorColor.val,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
        },
        headerTintColor: theme.color.val,
        headerTitleStyle: {
          fontFamily: 'Pretendard-Bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerShown: false,
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

- [ ] **Step 2: Verify tabs render with new theme colors**

앱을 리로드하여 탭 바가 다크 배경 + 골드 액센트로 표시되는지 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): apply design system theme to tab navigation"
```

---

### Task 9: Migrate Home Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Rewrite Home screen with Tamagui components**

Replace the entire file content with:

```typescript
// apps/mobile/app/(tabs)/index.tsx
import { YStack, Text } from 'tamagui';

export default function HomeScreen() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
      <Text fontFamily="$heading" fontSize="$largeTitle" fontWeight="$largeTitle" color="$color">
        ipchun
      </Text>
      <Text
        fontFamily="$body"
        fontSize="$subhead"
        color="$colorSecondary"
        marginTop="$2"
      >
        인디 아티스트를 더 가까이
      </Text>
    </YStack>
  );
}
```

참고:
- `View`/`StyleSheet` → `YStack`
- `Text`(RN) → `Text`(Tamagui)
- 하드코딩 색상 → `$background`, `$color`, `$colorSecondary` 테마 토큰
- 하드코딩 사이즈 → `$largeTitle`, `$subhead` 폰트 토큰

- [ ] **Step 2: Verify Home screen renders correctly**

앱에서 홈 탭 확인. 다크 배경에 "ipchun" 텍스트가 Pretendard 폰트로 표시되는지 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): migrate Home screen to Tamagui design system"
```

---

### Task 10: Migrate Artists Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/artists.tsx`

- [ ] **Step 1: Rewrite Artists screen with Tamagui components**

Replace the entire file content with:

```typescript
// apps/mobile/app/(tabs)/artists.tsx
import { YStack, Text } from 'tamagui';

export default function ArtistsScreen() {
  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center" marginTop="$10">
        등록된 아티스트가 없습니다
      </Text>
    </YStack>
  );
}
```

참고:
- 페이지 제목은 탭 헤더(Task 8에서 설정)가 담당하므로 본문에서 제거
- 빈 상태 텍스트에 `$colorSecondary` 적용

- [ ] **Step 2: Verify Artists screen renders**

앱에서 아티스트 탭 확인. 빈 상태 텍스트가 보조 색상으로 중앙 표시되는지 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/artists.tsx
git commit -m "feat(mobile): migrate Artists screen to Tamagui design system"
```

---

### Task 11: Migrate Schedules Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/schedules.tsx`

- [ ] **Step 1: Rewrite Schedules screen with Tamagui components**

Replace the entire file content with:

```typescript
// apps/mobile/app/(tabs)/schedules.tsx
import { YStack, Text } from 'tamagui';

export default function SchedulesScreen() {
  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center" marginTop="$10">
        등록된 일정이 없습니다
      </Text>
    </YStack>
  );
}
```

- [ ] **Step 2: Verify Schedules screen renders**

앱에서 일정 탭 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/schedules.tsx
git commit -m "feat(mobile): migrate Schedules screen to Tamagui design system"
```

---

### Task 12: Migrate Artist Detail Screen

**Files:**
- Modify: `apps/mobile/app/artists/[id].tsx`

- [ ] **Step 1: Rewrite Artist Detail screen with Tamagui components**

Replace the entire file content with:

```typescript
// apps/mobile/app/artists/[id].tsx
import { YStack, Text } from 'tamagui';
import { useLocalSearchParams } from 'expo-router';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
        아티스트 상세
      </Text>
      <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" marginTop="$2">
        ID: {id}
      </Text>
    </YStack>
  );
}
```

- [ ] **Step 2: Verify Artist Detail screen renders**

아티스트 상세 화면 접근하여 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/artists/[id].tsx
git commit -m "feat(mobile): migrate Artist Detail screen to Tamagui design system"
```

---

## Chunk 3: Cleanup

### Task 13: Remove Unused Assets and Verify Full App

**Files:**
- Modify: `apps/mobile/app.json` (splash background color 변경)

- [ ] **Step 1: Update app.json splash background to dark**

`apps/mobile/app.json`에서 splash `backgroundColor`를 `#000000`으로 변경:

```json
"splash": {
  "image": "./assets/images/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#000000"
}
```

- [ ] **Step 2: Full app smoke test**

```bash
cd apps/mobile && npx expo start --clear
```

확인 사항:
1. 앱이 에러 없이 시작되는가
2. 홈 화면: 다크 배경 + Pretendard "ipchun" + 골드 탭 아이콘
3. 아티스트 탭: 다크 배경 + 빈 상태 텍스트
4. 일정 탭: 다크 배경 + 빈 상태 텍스트
5. 시스템 라이트 모드 전환 시 밝은 테마 적용되는가

- [ ] **Step 3: Remove SpaceMono font (no longer used)**

```bash
rm apps/mobile/assets/fonts/SpaceMono-Regular.ttf
```

- [ ] **Step 4: Commit cleanup**

```bash
git add apps/mobile/app.json
git rm apps/mobile/assets/fonts/SpaceMono-Regular.ttf
git commit -m "chore(mobile): update splash to dark background and remove unused SpaceMono font"
```
