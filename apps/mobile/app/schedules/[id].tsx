import { useState, useEffect } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Spinner } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { CalendarSchedule } from '../../src/api/client';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../../src/constants/schedule';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<CalendarSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.schedules.getOne(id)
      .then(setSchedule)
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

  if (error || !schedule) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$4">
        <Text fontFamily="$body" color="$negativeColor">{error ?? '일정을 찾을 수 없습니다'}</Text>
      </YStack>
    );
  }

  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;

  return (
    <ScrollView backgroundColor="$background">
      {/* Hero image */}
      {schedule.imageUrl && (
        <Image source={{ uri: schedule.imageUrl }} width="100%" height={220} />
      )}

      <YStack padding="$4" gap="$3">
        {/* Type badge + title */}
        <XStack alignItems="center" gap="$2">
          <YStack backgroundColor={typeColor} paddingHorizontal="$2" paddingVertical={2} borderRadius="$sm">
            <Text fontSize={10} fontWeight="700" color="#FFFFFF">{typeLabel}</Text>
          </YStack>
        </XStack>
        <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$color">
          {schedule.title}
        </Text>

        {/* Date/Time */}
        <YStack gap="$1">
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
            {formatDate(schedule.startDate)} {formatTime(schedule.startDate)}
            {schedule.endDate && ` ~ ${formatDate(schedule.endDate)} ${formatTime(schedule.endDate)}`}
          </Text>
        </YStack>

        {/* Location */}
        {schedule.location && (
          <YStack gap="$1">
            <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">{schedule.location}</Text>
            {schedule.address && (
              <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{schedule.address}</Text>
            )}
          </YStack>
        )}

        {/* Description */}
        {schedule.description && (
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary" lineHeight={22}>
            {schedule.description}
          </Text>
        )}

        {/* Lineup */}
        {schedule.lineups.length > 0 && (
          <YStack gap="$3" marginTop="$2">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color="$color">
              라인업 ({schedule.lineups.length})
            </Text>
            {schedule.lineups.map((lineup) => (
              <XStack
                key={lineup.id}
                gap="$3"
                alignItems="center"
                paddingVertical="$2"
                onPress={() => router.push(`/artists/${lineup.artist.id}`)}
                pressStyle={{ opacity: 0.7 }}
              >
                {lineup.artist.imageUrl ? (
                  <Image source={{ uri: lineup.artist.imageUrl }} width={44} height={44} borderRadius={999} />
                ) : (
                  <YStack width={44} height={44} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                    <Text fontSize={18} color="$colorTertiary">🎵</Text>
                  </YStack>
                )}
                <YStack flex={1}>
                  <Text fontFamily="$body" fontSize={15} fontWeight="600" color="$color">
                    {lineup.artist.name}
                  </Text>
                  <XStack gap="$2">
                    {lineup.stageName && (
                      <Text fontSize={12} fontFamily="$body" color="$colorTertiary">{lineup.stageName}</Text>
                    )}
                    {lineup.startTime && (
                      <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
                        {formatTime(lineup.startTime)}
                        {lineup.endTime && ` ~ ${formatTime(lineup.endTime)}`}
                      </Text>
                    )}
                  </XStack>
                </YStack>
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
