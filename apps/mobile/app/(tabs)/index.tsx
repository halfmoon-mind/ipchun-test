import { YStack, Text } from 'tamagui';

export default function HomeScreen() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
      <Text fontFamily="$heading" fontSize="$largeTitle" fontWeight="$largeTitle" color="$color">
        ipchun
      </Text>
      <Text
        fontFamily="$body"
        fontSize="$subhead"
        color="$colorSecondary"
        marginTop="$2"
      >
        인디 아티스트를 더 가까이
      </Text>
    </YStack>
  );
}
