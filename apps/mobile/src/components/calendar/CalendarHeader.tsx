import { XStack, Text, Button } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarHeader({ year, month, onPrev, onNext }: CalendarHeaderProps) {
  const theme = useTheme();

  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
      <Button size="$3" circular chromeless onPress={onPrev}>
        <Ionicons name="chevron-back" size={20} color={theme.color.val} />
      </Button>
      <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="$color">
        {year}년 {month}월
      </Text>
      <Button size="$3" circular chromeless onPress={onNext}>
        <Ionicons name="chevron-forward" size={20} color={theme.color.val} />
      </Button>
    </XStack>
  );
}
