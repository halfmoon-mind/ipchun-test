import { YStack, XStack, Text } from 'tamagui';
import { SCHEDULE_TYPE_COLORS } from '../../constants/schedule';

interface CalendarDayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  types: string[];
  onPress: () => void;
}

export function CalendarDayCell({ day, isCurrentMonth, isToday, isSelected, types, onPress }: CalendarDayCellProps) {
  const maxDots = 3;
  const visibleTypes = types.slice(0, maxDots);

  return (
    <YStack
      flex={1}
      alignItems="center"
      paddingVertical="$1"
      onPress={onPress}
      backgroundColor={isSelected ? '$accentColorSubtle' : 'transparent'}
      borderRadius="$sm"
      minHeight={44}
    >
      <Text
        fontSize={14}
        fontFamily="$body"
        color={!isCurrentMonth ? '$colorTertiary' : isToday ? '$accentColor' : '$color'}
        fontWeight={isToday ? '700' : '400'}
      >
        {day}
      </Text>
      <XStack gap={2} marginTop={2} height={6} alignItems="center">
        {visibleTypes.map((type, i) => (
          <YStack
            key={i}
            width={5}
            height={5}
            borderRadius={999}
            backgroundColor={SCHEDULE_TYPE_COLORS[type] ?? SCHEDULE_TYPE_COLORS.OTHER}
          />
        ))}
        {types.length > maxDots && (
          <Text fontSize={8} color="$colorSecondary">+{types.length - maxDots}</Text>
        )}
      </XStack>
    </YStack>
  );
}
