import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top} paddingBottom={insets.bottom}>
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <Text fontFamily="$heading" fontSize="$largeTitle" fontWeight="$largeTitle" color="$color">
          ipchun
        </Text>
        <Text
          fontFamily="$body"
          fontSize="$subhead"
          color="$colorSecondary"
        >
          인디 아티스트를 더 가까이
        </Text>
      </YStack>
    </YStack>
  );
}
