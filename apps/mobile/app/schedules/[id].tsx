import { useState, useEffect } from 'react';
import { YStack, XStack, Text, Image, ScrollView, Spinner, useTheme } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const theme = useTheme();
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
        <Image source={{ uri: schedule.imageUrl }} width="100%" height={240} resizeMode="cover" />
      )}

      <YStack padding="$4" gap="$4" paddingBottom="$12">
        {/* Type badge + title */}
        <YStack gap="$2">
          <XStack alignItems="center" gap="$2">
            <YStack backgroundColor={typeColor} paddingHorizontal="$2" paddingVertical={3} borderRadius="$sm">
              <Text fontSize={11} fontWeight="700" color="#FFFFFF">{typeLabel}</Text>
            </YStack>
          </XStack>
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$color">
            {schedule.title}
          </Text>
        </YStack>

        {/* Date/Time */}
        <XStack alignItems="center" gap="$2">
          <Ionicons name="time-outline" size={16} color={theme.colorSecondary.val} />
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
            {formatDate(schedule.startDate)} {formatTime(schedule.startDate)}
            {schedule.endDate && ` ~ ${formatDate(schedule.endDate)} ${formatTime(schedule.endDate)}`}
          </Text>
        </XStack>

        {/* Location */}
        {schedule.location && (
          <XStack alignItems="flex-start" gap="$2">
            <Ionicons name="location-outline" size={16} color={theme.colorSecondary.val} style={{ marginTop: 2 }} />
            <YStack flex={1} gap={2}>
              <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">{schedule.location}</Text>
              {schedule.address && (
                <Text fontFamily="$body" fontSize={12} color="$colorTertiary">{schedule.address}</Text>
              )}
            </YStack>
          </XStack>
        )}

        {/* Description */}
        {schedule.description && (
          <YStack paddingTop="$2" borderTopWidth={0.5} borderTopColor="$separatorColor">
            <Text fontFamily="$body" fontSize={14} color="$colorSecondary" lineHeight={22}>
              {schedule.description}
            </Text>
          </YStack>
        )}

        {/* Lineup */}
        {schedule.lineups.length > 0 && (
          <YStack gap="$3" paddingTop="$2" borderTopWidth={0.5} borderTopColor="$separatorColor">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color="$color">
              라인업 ({schedule.lineups.length})
            </Text>
            {schedule.lineups.map((lineup, index) => (
              <XStack
                key={lineup.id}
                gap="$3"
                alignItems="center"
                paddingVertical="$2"
                borderTopWidth={index > 0 ? 0.5 : 0}
                borderTopColor="$separatorColor"
                onPress={() => router.push(`/artists/${lineup.artist.id}`)}
                pressStyle={{ opacity: 0.7 }}
              >
                {lineup.artist.imageUrl ? (
                  <Image source={{ uri: lineup.artist.imageUrl }} width={44} height={44} borderRadius={999} />
                ) : (
                  <YStack width={44} height={44} borderRadius={999} backgroundColor="$backgroundNested" alignItems="center" justifyContent="center">
                    <Ionicons name="musical-note" size={18} color={theme.colorTertiary.val} />
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
                <Ionicons name="chevron-forward" size={16} color={theme.colorTertiary.val} />
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
