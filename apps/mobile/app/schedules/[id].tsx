import { useState, useEffect } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Spinner, useTheme } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import type { CalendarPerformance } from '../../src/api/client';
import { GENRE_COLORS, GENRE_LABELS } from '../../src/constants/schedule';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function PerformanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [performance, setPerformance] = useState<CalendarPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.performances.getOne(id)
      .then(setPerformance)
      .catch((e) => setError(e instanceof Error ? e.message : '불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" color="$accentColor" />
      </YStack>
    );
  }

  if (error || !performance) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$4">
        <Text fontFamily="$body" color="$negativeColor">{error ?? '공연을 찾을 수 없습니다'}</Text>
      </YStack>
    );
  }

  const genreColor = GENRE_COLORS[performance.genre] ?? GENRE_COLORS.OTHER;
  const genreLabel = GENRE_LABELS[performance.genre] ?? performance.genre;

  return (
    <ScrollView backgroundColor="$background">
      {performance.posterUrl && (
        <Image source={{ uri: performance.posterUrl }} width="100%" height={240} resizeMode="cover" />
      )}

      <YStack padding="$4" gap="$4" paddingBottom="$12">
        <YStack gap="$2">
          <XStack alignItems="center" gap="$2">
            <YStack backgroundColor={genreColor} paddingHorizontal="$2" paddingVertical={3} borderRadius="$sm">
              <Text fontSize={11} fontWeight="700" color="#FFFFFF">{genreLabel}</Text>
            </YStack>
          </XStack>
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$color">
            {performance.title}
          </Text>
        </YStack>

        {/* Schedules */}
        {performance.schedules.length > 0 && (
          <XStack alignItems="center" gap="$2">
            <Ionicons name="time-outline" size={16} color={theme.colorSecondary.val} />
            <YStack>
              {performance.schedules.map((s) => (
                <Text key={s.id} fontFamily="$body" fontSize={14} color="$colorSecondary">
                  {formatDate(s.dateTime)} {formatTime(s.dateTime)}
                </Text>
              ))}
            </YStack>
          </XStack>
        )}

        {/* Venue */}
        {performance.venue && (
          <XStack alignItems="flex-start" gap="$2">
            <Ionicons name="location-outline" size={16} color={theme.colorSecondary.val} style={{ marginTop: 2 }} />
            <YStack flex={1} gap={2}>
              <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">{performance.venue.name}</Text>
              {performance.venue.address && (
                <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{performance.venue.address}</Text>
              )}
            </YStack>
          </XStack>
        )}

        {/* Description */}
        {performance.description && (
          <YStack paddingTop="$2" borderTopWidth={0.5} borderTopColor="$separatorColor">
            <Text fontFamily="$body" fontSize={14} color="$colorSecondary" lineHeight={22}>
              {performance.description}
            </Text>
          </YStack>
        )}

        {/* Artists */}
        {performance.artists.length > 0 && (
          <YStack gap="$3" paddingTop="$2" borderTopWidth={0.5} borderTopColor="$separatorColor">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color="$color">
              라인업 ({performance.artists.length})
            </Text>
            {performance.artists.map((entry, index) => (
              <XStack
                key={entry.id}
                gap="$3"
                alignItems="center"
                paddingVertical="$2"
                borderTopWidth={index > 0 ? 0.5 : 0}
                borderTopColor="$separatorColor"
                onPress={() => router.push(`/artists/${entry.artist.id}`)}
                pressStyle={{ opacity: 0.7 }}
              >
                {entry.artist.imageUrl ? (
                  <Image source={{ uri: entry.artist.imageUrl }} width={44} height={44} borderRadius={999} />
                ) : (
                  <YStack width={44} height={44} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                    <Ionicons name="musical-note" size={18} color={theme.colorTertiary.val} />
                  </YStack>
                )}
                <YStack flex={1}>
                  <Text fontFamily="$body" fontSize={15} fontWeight="600" color="$color">
                    {entry.artist.name}
                  </Text>
                  <XStack gap="$2">
                    {entry.stageName && (
                      <Text fontSize={12} fontFamily="$body" color="$colorTertiary">{entry.stageName}</Text>
                    )}
                    {entry.startTime && (
                      <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
                        {formatTime(entry.startTime)}
                        {entry.endTime && ` ~ ${formatTime(entry.endTime)}`}
                      </Text>
                    )}
                  </XStack>
                </YStack>
                <Ionicons name="chevron-forward" size={16} color={theme.colorTertiary.val} />
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
