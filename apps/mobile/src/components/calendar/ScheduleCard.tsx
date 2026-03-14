import { XStack, YStack, Text } from 'tamagui';
import { SCHEDULE_TYPE_COLORS, SCHEDULE_TYPE_LABELS } from '../../constants/schedule';
import type { CalendarSchedule } from '../../api/client';

interface ScheduleCardProps {
  schedule: CalendarSchedule;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ScheduleCard({ schedule, onPress }: ScheduleCardProps) {
  const typeColor = SCHEDULE_TYPE_COLORS[schedule.type] ?? SCHEDULE_TYPE_COLORS.OTHER;
  const typeLabel = SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type;
  const artistCount = schedule.lineups.length;

  return (
    <XStack
      backgroundColor="$backgroundElevated"
      borderRadius="$md"
      padding="$3"
      gap="$3"
      onPress={onPress}
      pressStyle={{ opacity: 0.8 }}
    >
      {/* Color indicator bar */}
      <YStack width={4} borderRadius="$full" backgroundColor={typeColor} />

      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={10} fontFamily="$body" color={typeColor} fontWeight="600">
            {typeLabel}
          </Text>
        </XStack>
        <Text fontSize={15} fontFamily="$heading" fontWeight="600" color="$color" numberOfLines={1}>
          {schedule.title}
        </Text>
        <XStack gap="$2" alignItems="center">
          <Text fontSize={12} fontFamily="$body" color="$colorSecondary">
            {formatTime(schedule.startDate)}
            {schedule.endDate && ` ~ ${formatTime(schedule.endDate)}`}
          </Text>
        </XStack>
        {schedule.location && (
          <Text fontSize={12} fontFamily="$body" color="$colorTertiary" numberOfLines={1}>
            {schedule.location}
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
