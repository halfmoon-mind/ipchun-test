import { YStack, Text } from 'tamagui';
import { useLocalSearchParams } from 'expo-router';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
        아티스트 상세
      </Text>
      <Text fontFamily="$body" fontSize="$body" color="$colorSecondary" marginTop="$2">
        ID: {id}
      </Text>
    </YStack>
  );
}
