import { YStack, Text } from 'tamagui';
import { ScheduleCard } from './ScheduleCard';
import type { CalendarSchedule } from '../../api/client';

interface ScheduleListProps {
  date: string;
  schedules: CalendarSchedule[];
  onSchedulePress: (schedule: CalendarSchedule) => void;
}

export function ScheduleList({ date, schedules, onSchedulePress }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <YStack padding="$8" alignItems="center">
        <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
          일정이 없습니다
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$2" padding="$4">
      {schedules.map((s) => (
        <ScheduleCard key={s.id} schedule={s} onPress={() => onSchedulePress(s)} />
      ))}
    </YStack>
  );
}
