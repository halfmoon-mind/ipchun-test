import { YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { ScheduleCard } from './ScheduleCard';
import type { CalendarPerformance } from '../../api/client';

interface ScheduleListProps {
  date: string;
  performances: CalendarPerformance[];
  onPerformancePress: (performance: CalendarPerformance) => void;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export function ScheduleList({ date, performances, onPerformancePress }: ScheduleListProps) {
  const theme = useTheme();

  return (
    <YStack padding="$4" gap="$3">
      <Text fontFamily="$heading" fontSize={15} fontWeight="600" color="$color">
        {formatDateLabel(date)}
      </Text>
      {performances.length === 0 ? (
        <YStack padding="$6" alignItems="center" gap="$2">
          <Ionicons name="calendar-outline" size={32} color={theme.colorTertiary.val} />
          <Text fontFamily="$body" fontSize={14} color="$colorSecondary">
            일정이 없습니다
          </Text>
        </YStack>
      ) : (
        <YStack gap="$2">
          {performances.map((p) => (
            <ScheduleCard key={p.id} performance={p} dateKey={date} onPress={() => onPerformancePress(p)} />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
