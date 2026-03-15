import { Link, Stack } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없음' }} />
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background" gap="$3">
        <Ionicons name="alert-circle-outline" size={48} color={theme.colorTertiary.val} />
        <Text fontFamily="$heading" fontSize="$title" fontWeight="$title" color="$color">
          페이지를 찾을 수 없습니다
        </Text>
        <Link href="/">
          <Text fontFamily="$body" fontSize="$subhead" color="$accentColor">
            홈으로 돌아가기
          </Text>
        </Link>
      </YStack>
    </>
  );
}
