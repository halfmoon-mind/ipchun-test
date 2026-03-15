import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.colorTertiary.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.separatorColor.val,
          borderTopWidth: 0.5,
          elevation: 0,
          height: 49 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: 'Pretendard-SemiBold',
          fontSize: 10,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.separatorColor.val,
        },
        headerTintColor: theme.color.val,
        headerTitleStyle: {
          fontFamily: 'Pretendard-Bold',
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="artists"
        options={{
          title: '아티스트',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
