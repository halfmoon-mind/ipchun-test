import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.colorTertiary.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.separatorColor.val,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
        },
        headerTintColor: theme.color.val,
        headerTitleStyle: {
          fontFamily: 'Pretendard-Bold',
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
