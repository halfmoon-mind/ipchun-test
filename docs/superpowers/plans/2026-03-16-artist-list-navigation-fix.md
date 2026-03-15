# 아티스트 리스트 → 상세 화면 네비게이션 수정

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아티스트 리스트에서 항목을 탭하면 상세 화면으로 이동하도록 수정하고, 상세 화면에서 아티스트 정보를 표시

**Architecture:** 모바일 리스트 화면에 expo-router 네비게이션 추가, API 클라이언트에 `getOne` 메서드 추가, 상세 화면에서 API 호출 후 아티스트 정보 렌더링. 서버 API(`GET /artists/:id`)는 이미 존재하므로 서버 변경 없음.

**Tech Stack:** React Native (Expo SDK 55), expo-router, Tamagui 2, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/mobile/app/(tabs)/artists.tsx` | Modify | 리스트 항목에 `onPress` 네비게이션 추가 |
| `apps/mobile/src/api/client.ts` | Modify | `artists.getOne(id)` 메서드 + `ArtistDetail` 타입 추가 |
| `apps/mobile/app/artists/[id].tsx` | Modify | 상세 화면 전체 구현 (API 호출 + UI 렌더링) |

---

## Chunk 1: 네비게이션 연결 및 상세 화면 구현

### Task 1: API 클라이언트에 아티스트 상세 조회 추가

**Files:**
- Modify: `apps/mobile/src/api/client.ts`

- [ ] **Step 1: shared 패키지에서 `Artist` 타입 import 및 `getOne` 메서드 추가**

`apps/mobile/src/api/client.ts` 파일 상단에 shared 패키지 import 추가:

```typescript
import type { Artist } from '@ipchun/shared';
```

기존 `artists` 객체에 `getOne` 추가 (기존 `getAll` 유지):

```typescript
artists: {
  getAll() {
    return request<ArtistSummary[]>('/artists');
  },
  getOne(id: string) {
    return request<Artist>(`/artists/${id}`);
  },
},
```

> `Artist` 타입은 `packages/shared/src/index.ts`에 이미 정의되어 있으며, 서버 `GET /artists/:id` 응답과 정확히 일치합니다.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/api/client.ts
git commit -m "feat(mobile): add artists.getOne API method using shared Artist type"
```

---

### Task 2: 아티스트 리스트에 네비게이션 추가

**Files:**
- Modify: `apps/mobile/app/(tabs)/artists.tsx`

- [ ] **Step 1: `useRouter` import 추가 및 네비게이션 연결**

`artists.tsx` 상단 import에 `useRouter` 추가:

```typescript
import { useRouter } from 'expo-router';
```

컴포넌트 내부에서 router 초기화:

```typescript
const router = useRouter();
```

`renderItem`의 `<XStack>` 에 `onPress`와 `pressStyle` 추가:

```tsx
<XStack
  alignItems="center"
  gap="$3"
  paddingVertical="$2"
  onPress={() => router.push(`/artists/${item.id}`)}
  pressStyle={{ opacity: 0.7 }}
>
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/artists.tsx
git commit -m "fix(mobile): add navigation from artist list to detail screen"
```

---

### Task 3: 아티스트 상세 화면 구현

**Files:**
- Modify: `apps/mobile/app/artists/[id].tsx`

- [ ] **Step 1: 전체 화면 컴포넌트 교체**

`apps/mobile/app/artists/[id].tsx`를 다음으로 교체:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Spinner, ScrollView, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import type { Artist } from '@ipchun/shared';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.artists.getOne(id);
      setArtist(data);
    } catch {
      setError('아티스트 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !artist) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3" padding="$4">
        <Ionicons name="alert-circle-outline" size={48} color={theme.negativeColor.val} />
        <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center">
          {error ?? '아티스트를 찾을 수 없습니다'}
        </Text>
        <Pressable onPress={load}>
          <Text fontFamily="$body" fontSize="$body" color="$accentColor" fontWeight="600">
            재시도
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const socialEntries = artist.socialLinks ? Object.entries(artist.socialLinks) : [];

  return (
    <ScrollView backgroundColor="$background" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      {/* Profile Header */}
      <XStack padding="$4" gap="$4" alignItems="center">
        {artist.imageUrl ? (
          <Image
            source={{ uri: artist.imageUrl }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        ) : (
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="$backgroundNested"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="person" size={36} color={theme.colorTertiary.val} />
          </YStack>
        )}
        <YStack flex={1} gap="$1">
          <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
            {artist.name}
          </Text>
          {(artist.followers != null || artist.monthlyListeners != null) && (
            <XStack gap="$3">
              {artist.followers != null && (
                <Text fontFamily="$body" fontSize="$caption" color="$colorSecondary">
                  팔로워 {artist.followers.toLocaleString()}
                </Text>
              )}
              {artist.monthlyListeners != null && (
                <Text fontFamily="$body" fontSize="$caption" color="$colorSecondary">
                  월간 리스너 {artist.monthlyListeners.toLocaleString()}
                </Text>
              )}
            </XStack>
          )}
        </YStack>
      </XStack>

      {/* Spotify Link */}
      {artist.spotifyUrl && (
        <YStack paddingHorizontal="$4" paddingBottom="$3">
          <Pressable onPress={() => Linking.openURL(artist.spotifyUrl!)}>
            <XStack
              backgroundColor="$backgroundNested"
              borderRadius="$md"
              padding="$3"
              alignItems="center"
              gap="$2"
            >
              <Ionicons name="musical-note" size={18} color={theme.accentColor.val} />
              <Text fontFamily="$body" fontSize="$body" color="$accentColor" fontWeight="600">
                Spotify에서 듣기
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      )}

      {/* Description */}
      {artist.description && (
        <YStack paddingHorizontal="$4" paddingBottom="$4">
          <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" lineHeight={22}>
            {artist.description}
          </Text>
        </YStack>
      )}

      {/* Social Links */}
      {socialEntries.length > 0 && (
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          <Text fontFamily="$body" fontSize="$caption" color="$colorTertiary" fontWeight="600">
            소셜 링크
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {socialEntries.map(([name, url]) => (
              <Pressable key={name} onPress={() => Linking.openURL(url)}>
                <YStack
                  backgroundColor="$backgroundNested"
                  borderRadius="$sm"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                >
                  <Text fontFamily="$body" fontSize="$caption" color="$accentColor" fontWeight="600">
                    {name}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
        </YStack>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: 타입 에러 없음 (또는 기존 에러만)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/artists/[id].tsx
git commit -m "feat(mobile): implement artist detail screen with profile, spotify, social links"
```

---

### Task 4: 수동 검증

- [ ] **Step 1: 모바일 앱 실행**

Run: `cd apps/mobile && npx expo start`

- [ ] **Step 2: 기능 확인**

1. 아티스트 탭 진입 → 리스트 표시 확인
2. 아티스트 항목 탭 → 상세 화면 이동 확인
3. 상세 화면에서 아티스트 이름, 이미지, 설명, Spotify 링크, 소셜 링크 표시 확인
4. 뒤로가기로 리스트 복귀 확인
