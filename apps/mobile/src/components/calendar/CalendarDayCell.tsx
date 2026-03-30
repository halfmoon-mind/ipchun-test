import { YStack, XStack, Text } from 'tamagui';
import { GENRE_COLORS } from '../../constants/schedule';

interface CalendarDayCellProps {
  day: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  types: string[];
  onPress: () => void;
}

export function CalendarDayCell({ day, dayOfWeek, isCurrentMonth, isToday, isSelected, types, onPress }: CalendarDayCellProps) {
  const maxDots = 3;
  const visibleTypes = types.slice(0, maxDots);

  return (
    <YStack
      flex={1}
      alignItems="center"
      paddingVertical="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.6 }}
      backgroundColor={isSelected ? '$accentColorSubtle' : 'transparent'}
      borderRadius="$sm"
      minHeight={48}
    >
      <Text
        fontSize={14}
        fontFamily="$body"
        color={!isCurrentMonth ? '$colorTertiary' : isToday ? '$accentColor' : dayOfWeek === 0 ? '$negativeColor' : dayOfWeek === 6 ? '$accentColor' : '$color'}
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
            backgroundColor={GENRE_COLORS[type] ?? GENRE_COLORS.OTHER}
          />
        ))}
        {types.length > maxDots && (
          <Text fontSize={8} color="$colorSecondary">+{types.length - maxDots}</Text>
        )}
      </XStack>
    </YStack>
  );
}
