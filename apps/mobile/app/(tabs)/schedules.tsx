import { YStack, Text } from 'tamagui';

export default function SchedulesScreen() {
  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" textAlign="center" marginTop="$10">
        등록된 일정이 없습니다
      </Text>
    </YStack>
  );
}
