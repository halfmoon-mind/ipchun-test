import { XStack, YStack, Text } from 'tamagui';
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
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal="$4"
      paddingVertical="$3"
      borderBottomWidth={0.5}
      borderBottomColor="$separatorColor"
    >
      <YStack
        width={44}
        height={44}
        alignItems="center"
        justifyContent="center"
        onPress={onPrev}
        pressStyle={{ opacity: 0.6 }}
      >
        <Ionicons name="chevron-back" size={22} color={theme.color.val} />
      </YStack>
      <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="$color">
        {year}년 {month}월
      </Text>
      <YStack
        width={44}
        height={44}
        alignItems="center"
        justifyContent="center"
        onPress={onNext}
        pressStyle={{ opacity: 0.6 }}
      >
        <Ionicons name="chevron-forward" size={22} color={theme.color.val} />
      </YStack>
    </XStack>
  );
}
