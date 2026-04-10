import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Artist, type CalendarPerformance } from '../../src/api/client';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [upcoming, setUpcoming] = useState<CalendarPerformance[]>([]);
  const [past, setPast] = useState<CalendarPerformance[]>([]);
  const [pastCursor, setPastCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descNeedsToggle, setDescNeedsToggle] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const requests: Promise<unknown>[] = [
        api.artists.getOne(id),
        api.performances.getByArtist(id, { period: 'upcoming' }),
        api.performances.getByArtist(id, { period: 'past', limit: 10 }),
      ];
      if (user) {
        requests.push(api.users.getFollows());
      }
      const results = await Promise.all(requests);
      const [artistData, upcomingData, pastData] = results as [
        Artist,
        { data: CalendarPerformance[]; nextCursor: string | null },
        { data: CalendarPerformance[]; nextCursor: string | null },
      ];
      setArtist(artistData);
      setUpcoming(upcomingData.data);
      setPast(pastData.data);
      setPastCursor(pastData.nextCursor);
      if (user && results[3]) {
        const follows = results[3] as { id: string }[];
        setIsFollowed(follows.some((f) => f.id === id));
      }
    } catch {
      setError('아티스트 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const loadMorePast = async () => {
    if (!id || !pastCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.performances.getByArtist(id, {
        period: 'past',
        cursor: pastCursor,
        limit: 10,
      });
      setPast((prev) => [...prev, ...res.data]);
      setPastCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollowToggle = useCallback(async () => {
    if (!id || followLoading) return;
    setFollowLoading(true);
    const prevFollowed = isFollowed;
    setIsFollowed(!prevFollowed);
    try {
      if (prevFollowed) {
        await api.users.unfollowArtist(id);
      } else {
        await api.users.followArtist(id);
      }
    } catch {
      setIsFollowed(prevFollowed);
    } finally {
      setFollowLoading(false);
    }
  }, [id, isFollowed, followLoading]);

  const headerOptions = {
    headerShown: true,
    title: artist?.name ?? '',
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: {
      backgroundColor: theme.background.val,
    },
    headerTintColor: theme.color.val,
    headerTitleStyle: {
      fontFamily: 'Pretendard-Bold',
      fontSize: 17,
    },
    headerShadowVisible: false,
    ...(user && {
      headerRight: () => (
        <Pressable onPress={handleFollowToggle} disabled={followLoading} style={{ paddingHorizontal: 8 }}>
          {followLoading ? (
            <Spinner size="small" color="$accentColor" />
          ) : (
            <Ionicons
              name={isFollowed ? 'heart' : 'heart-outline'}
              size={24}
              color={isFollowed ? '#DC2626' : theme.color.val}
            />
          )}
        </Pressable>
      ),
    }),
  };

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Stack.Screen options={headerOptions} />
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !artist) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3">
        <Stack.Screen options={headerOptions} />
        <Ionicons name="alert-circle-outline" size={48} color={theme.negativeColor.val} />
        <Text color="$colorSecondary" fontSize="$body">
          {error ?? '아티스트를 찾을 수 없습니다.'}
        </Text>
        <Pressable onPress={load}>
          <Text color="$accentColor" fontSize="$body" fontWeight="600">재시도</Text>
        </Pressable>
      </YStack>
    );
  }

  const socialEntries = artist.socialLinks ? Object.entries(artist.socialLinks) : [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <Stack.Screen options={headerOptions} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <XStack padding="$4" gap="$4" alignItems="flex-start">
          <YStack
            width={72}
            height={72}
            borderRadius="$md"
            backgroundColor="$backgroundElevated"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {artist.imageUrl ? (
              <Image
                source={{ uri: artist.imageUrl }}
                style={{ width: 72, height: 72, borderRadius: 12 }}
              />
            ) : (
              <Ionicons name="person" size={32} color={theme.colorTertiary.val} />
            )}
          </YStack>
          <YStack flex={1} gap="$1">
            <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
              {artist.name}
            </Text>
            {artist.spotifyUrl && (
              <Pressable onPress={() => Linking.openURL(artist.spotifyUrl!)}>
                <XStack alignItems="center" gap="$1">
                  <Ionicons name="musical-note" size={14} color={theme.accentColor.val} />
                  <Text fontSize="$caption" color="$accentColor" fontWeight="600">
                    Spotify
                  </Text>
                </XStack>
              </Pressable>
            )}
            {socialEntries.length > 0 && (
              <XStack gap="$2" marginTop="$1" flexWrap="wrap">
                {socialEntries.map(([name, url]) => (
                  <Pressable key={name} onPress={() => Linking.openURL(url)}>
                    <YStack
                      backgroundColor="$backgroundElevated"
                      borderRadius="$sm"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                    >
                      <Text fontSize="$caption" color="$accentColor" fontWeight="600">
                        {name}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            )}
          </YStack>
        </XStack>

        {artist.description && (
          <YStack paddingHorizontal="$4" paddingBottom="$4">
            <Text
              fontSize="$body"
              color="$colorSecondary"
              lineHeight={22}
              numberOfLines={descExpanded ? undefined : 3}
              onTextLayout={(e: { nativeEvent: { lines: unknown[] } }) => {
                if (!descNeedsToggle && e.nativeEvent.lines.length > 3) {
                  setDescNeedsToggle(true);
                }
              }}
            >
              {artist.description}
            </Text>
            {descNeedsToggle && (
              <Pressable onPress={() => setDescExpanded((v) => !v)}>
                <Text fontSize="$caption" color="$accentColor" marginTop="$1">
                  {descExpanded ? '접기' : '더 보기'}
                </Text>
              </Pressable>
            )}
          </YStack>
        )}

        <YStack height={8} backgroundColor="$backgroundElevated" />

        {upcoming.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorSecondary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              다가오는 공연
            </Text>
            {upcoming.map((perf) => (
              <PerformanceCard
                key={perf.id}
                performance={perf}
                variant="upcoming"
                onPress={() => router.push(`/schedules/${perf.id}`)}
              />
            ))}
          </YStack>
        )}

        {upcoming.length > 0 && past.length > 0 && (
          <YStack height={1} backgroundColor="$backgroundNested" marginHorizontal="$4" />
        )}

        {past.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorTertiary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              지난 공연
            </Text>
            {past.map((perf) => (
              <PerformanceCard
                key={perf.id}
                performance={perf}
                variant="past"
                onPress={() => router.push(`/schedules/${perf.id}`)}
              />
            ))}
            {pastCursor && (
              <Pressable onPress={loadMorePast} disabled={loadingMore}>
                <YStack alignItems="center" padding="$2">
                  {loadingMore ? (
                    <Spinner size="small" color="$colorTertiary" />
                  ) : (
                    <Text fontSize="$caption" color="$colorTertiary">더 보기 ↓</Text>
                  )}
                </YStack>
              </Pressable>
            )}
          </YStack>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <YStack padding="$6" alignItems="center">
            <Text color="$colorSecondary" fontSize="$body">
              아직 등록된 공연이 없습니다
            </Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

function PerformanceCard({
  performance,
  variant,
  onPress,
}: {
  performance: CalendarPerformance;
  variant: 'upcoming' | 'past';
  onPress: () => void;
}) {
  const isPast = variant === 'past';
  const firstSchedule = performance.schedules[0];
  const formatted = firstSchedule ? formatPerformanceDate(new Date(firstSchedule.dateTime)) : '';

  return (
    <Pressable onPress={onPress}>
      <XStack
        backgroundColor="$backgroundElevated"
        borderRadius="$md"
        padding="$3"
        justifyContent="space-between"
        alignItems="flex-start"
        opacity={isPast ? 0.6 : 1}
      >
        <YStack flex={1} gap="$1">
          <Text
            fontSize="$caption"
            fontWeight="600"
            color={isPast ? '$colorTertiary' : '$accentColor'}
          >
            {formatted}
          </Text>
          <Text
            fontSize="$body"
            fontWeight="600"
            color={isPast ? '$colorSecondary' : '$color'}
          >
            {performance.title}
          </Text>
          {performance.venue && (
            <Text fontSize="$caption" color={isPast ? '$colorTertiary' : '$colorSecondary'}>
              {performance.venue.name}
            </Text>
          )}
        </YStack>
        <YStack
          backgroundColor="$backgroundNested"
          borderRadius="$sm"
          paddingHorizontal="$2"
          paddingVertical="$1"
        >
          <Text fontSize="$caption" color="$colorTertiary">{performance.genre}</Text>
        </YStack>
      </XStack>
    </Pressable>
  );
}

function formatPerformanceDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}
