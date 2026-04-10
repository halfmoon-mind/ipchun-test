import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { OneSignal } from 'react-native-onesignal';
import type { NotificationClickEvent } from 'react-native-onesignal';
import tamaguiConfig from '@/src/design-system/tamagui.config';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { api } from '@/src/api/client';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Initialize OneSignal at module level (before any rendering)
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';
if (ONESIGNAL_APP_ID) {
  OneSignal.initialize(ONESIGNAL_APP_ID);
  OneSignal.Notifications.requestPermission(true);
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Register device token with server when user logs in
  useEffect(() => {
    if (!user) return;
    OneSignal.User.pushSubscription.getIdAsync().then((playerId) => {
      if (playerId) {
        api.users.registerDeviceToken(playerId).catch(() => {});
      }
    });
  }, [user?.userId]);

  // Handle notification click → deep link to performance detail
  useEffect(() => {
    const handler = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as Record<string, string> | undefined;
      const performanceId = data?.performanceId;
      if (performanceId) {
        router.push(`/schedules/${performanceId}` as any);
      }
    };
    OneSignal.Notifications.addEventListener('click', handler);
    return () => OneSignal.Notifications.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/sign-in' as any);
    }
  }, [user, isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
        <Theme name={colorScheme === 'light' ? 'light' : 'dark'}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
