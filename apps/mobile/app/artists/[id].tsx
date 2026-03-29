import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Artist, type CalendarSchedule, type PaginatedScheduleResponse } from '../../src/api/client';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [upcoming, setUpcoming] = useState<CalendarSchedule[]>([]);
  const [past, setPast] = useState<CalendarSchedule[]>([]);
  const [pastCursor, setPastCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descNeedsToggle, setDescNeedsToggle] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [artistData, upcomingData, pastData] = await Promise.all([
        api.artists.getOne(id),
        api.schedules.getByArtist(id, { period: 'upcoming' }),
        api.schedules.getByArtist(id, { period: 'past', limit: 10 }),
      ]);
      setArtist(artistData);
      setUpcoming(upcomingData.data);
      setPast(pastData.data);
      setPastCursor(pastData.nextCursor);
    } catch {
      setError('아티스트 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadMorePast = async () => {
    if (!id || !pastCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.schedules.getByArtist(id, {
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

  const headerOptions = {
    headerShown: true,
    title: artist?.name ?? '',
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: {
      backgroundColor: theme.background.val,
    },
    headerTintColor: theme.color.val,
    headerTitleStyle: {
      fontFamily: 'Pretendard-Bold',
      fontSize: 17,
    },
    headerShadowVisible: false,
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
        {/* Compact Header */}
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
            {/* Spotify Link */}
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

        {/* Description */}
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

        {/* Divider */}
        <YStack height={8} backgroundColor="$backgroundElevated" />

        {/* Upcoming Schedules */}
        {upcoming.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorSecondary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              다가오는 일정
            </Text>
            {upcoming.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                variant="upcoming"
                onPress={() => router.push(`/schedules/${schedule.id}`)}
              />
            ))}
          </YStack>
        )}

        {/* Separator */}
        {upcoming.length > 0 && past.length > 0 && (
          <YStack height={1} backgroundColor="$backgroundNested" marginHorizontal="$4" />
        )}

        {/* Past Schedules */}
        {past.length > 0 && (
          <YStack padding="$4" gap="$2">
            <Text
              fontSize="$caption"
              color="$colorTertiary"
              fontWeight="600"
              letterSpacing={1}
              textTransform="uppercase"
            >
              지난 일정
            </Text>
            {past.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                variant="past"
                onPress={() => router.push(`/schedules/${schedule.id}`)}
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

        {/* Empty state */}
        {upcoming.length === 0 && past.length === 0 && (
          <YStack padding="$6" alignItems="center">
            <Text color="$colorSecondary" fontSize="$body">
              아직 등록된 일정이 없습니다
            </Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

// --- Schedule Card Component ---

function ScheduleCard({
  schedule,
  variant,
  onPress,
}: {
  schedule: CalendarSchedule;
  variant: 'upcoming' | 'past';
  onPress: () => void;
}) {
  const isPast = variant === 'past';
  const date = new Date(schedule.startDate);
  const formatted = formatScheduleDate(date);

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
            {schedule.title}
          </Text>
          {schedule.location && (
            <Text fontSize="$caption" color={isPast ? '$colorTertiary' : '$colorSecondary'}>
              {schedule.location}
            </Text>
          )}
        </YStack>
        <YStack
          backgroundColor="$backgroundNested"
          borderRadius="$sm"
          paddingHorizontal="$2"
          paddingVertical="$1"
        >
          <Text fontSize="$caption" color="$colorTertiary">{schedule.type}</Text>
        </YStack>
      </XStack>
    </Pressable>
  );
}

function formatScheduleDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}
