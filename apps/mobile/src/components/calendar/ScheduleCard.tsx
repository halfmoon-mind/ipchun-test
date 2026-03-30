import { XStack, YStack, Text } from 'tamagui';
import { GENRE_COLORS, GENRE_LABELS } from '../../constants/schedule';
import type { CalendarPerformance } from '../../api/client';

interface ScheduleCardProps {
  performance: CalendarPerformance;
  dateKey: string;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ScheduleCard({ performance, dateKey, onPress }: ScheduleCardProps) {
  const genreColor = GENRE_COLORS[performance.genre] ?? GENRE_COLORS.OTHER;
  const genreLabel = GENRE_LABELS[performance.genre] ?? performance.genre;
  const artistCount = performance.artists.length;

  // Find schedule times for this specific date
  const todaySchedules = performance.schedules.filter(
    (s) => s.dateTime.slice(0, 10) === dateKey,
  );
  const firstTime = todaySchedules.length > 0 ? todaySchedules[0].dateTime : null;

  return (
    <XStack
      backgroundColor="$backgroundElevated"
      borderRadius="$md"
      padding="$3"
      gap="$3"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <YStack width={3} borderRadius="$full" backgroundColor={genreColor} alignSelf="stretch" />

      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={10} fontFamily="$body" color={genreColor} fontWeight="600">
            {genreLabel}
          </Text>
        </XStack>
        <Text fontSize={15} fontFamily="$heading" fontWeight="600" color="$color" numberOfLines={1}>
          {performance.title}
        </Text>
        {firstTime && (
          <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
            {formatTime(firstTime)}
            {todaySchedules.length > 1 && ` 외 ${todaySchedules.length - 1}회`}
          </Text>
        )}
        {performance.venue && (
          <Text fontSize={12} fontFamily="$body" color="$colorTertiary" numberOfLines={1}>
            {performance.venue.name}
          </Text>
        )}
        {artistCount > 0 && (
          <Text fontSize={11} fontFamily="$body" color="$colorSecondary" marginTop="$1">
            아티스트 {artistCount}팀
          </Text>
        )}
      </YStack>
    </XStack>
  );
}
