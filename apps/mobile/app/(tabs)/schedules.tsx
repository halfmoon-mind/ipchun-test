import { useState, useEffect, useCallback } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { CalendarHeader } from '../../src/components/calendar/CalendarHeader';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';
import { ScheduleList } from '../../src/components/calendar/ScheduleList';
import { ScheduleBottomSheet } from '../../src/components/calendar/ScheduleBottomSheet';
import { api } from '../../src/api/client';
import type { CalendarResponse, CalendarPerformance } from '../../src/api/client';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

function getPerformancesForDate(performances: CalendarPerformance[], dateKey: string): CalendarPerformance[] {
  return performances
    .filter((p) => p.schedules.some((s) => s.dateTime.slice(0, 10) === dateKey))
    .sort((a, b) => {
      const aTime = a.schedules.find((s) => s.dateTime.slice(0, 10) === dateKey)?.dateTime ?? '';
      const bTime = b.schedules.find((s) => s.dateTime.slice(0, 10) === dateKey)?.dateTime ?? '';
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
}

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<CalendarPerformance | null>(null);
  const [followFilterOn, setFollowFilterOn] = useState(false);
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(new Set());

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const requests: [Promise<CalendarResponse>, Promise<{ id: string }[]> | null] = [
        api.performances.getCalendar(y, m),
        user ? api.users.getFollows() : null,
      ];
      const [result, follows] = await Promise.all(requests);
      setData(result);
      if (follows) {
        setFollowedArtistIds(new Set(follows.map((f) => f.id)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  useEffect(() => {
    if (data && year === now.getFullYear() && month === now.getMonth() + 1) {
      const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setSelectedDate(todayKey);
    }
  }, [data]);

  const handlePrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else { setMonth(month - 1); }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else { setMonth(month + 1); }
    setSelectedDate(null);
  };

  const allPerformances = data?.performances ?? [];
  const filteredPerformances = followFilterOn
    ? allPerformances.filter((p) =>
        p.artists.some((a) => followedArtistIds.has(a.artistId)),
      )
    : allPerformances;

  const filteredDates = followFilterOn
    ? Object.fromEntries(
        Object.entries(data?.dates ?? {}).map(([date, ids]) => [
          date,
          ids.filter((perfId) =>
            filteredPerformances.some((p) => p.id === perfId),
          ),
        ]).filter(([, ids]) => ids.length > 0),
      )
    : (data?.dates ?? {});

  const selectedPerformances = selectedDate
    ? getPerformancesForDate(filteredPerformances, selectedDate)
    : [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <CalendarHeader year={year} month={month} onPrev={handlePrev} onNext={handleNext} />

      {user && (
        <XStack paddingHorizontal="$4" paddingVertical="$2" justifyContent="flex-end">
          <Pressable onPress={() => setFollowFilterOn((v) => !v)}>
            <XStack
              alignItems="center"
              gap="$1.5"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              backgroundColor={followFilterOn ? '$color' : '$backgroundElevated'}
              borderRadius="$sm"
            >
              <Ionicons
                name={followFilterOn ? 'heart' : 'heart-outline'}
                size={14}
                color={followFilterOn ? '#FFFFFF' : '#777777'}
              />
              <Text
                fontFamily="$body"
                fontSize="$caption"
                fontWeight="600"
                color={followFilterOn ? 'white' : '$colorSecondary'}
              >
                팔로우만 보기
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      )}

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$accentColor" />
        </YStack>
      ) : error ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontFamily="$body" color="$negativeColor" textAlign="center">{error}</Text>
          <Text
            fontFamily="$body"
            color="$accentColor"
            marginTop="$3"
            onPress={() => fetchCalendar(year, month)}
          >
            다시 시도
          </Text>
        </YStack>
      ) : (
        <ScrollView>
          <CalendarGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            dates={filteredDates}
            onSelectDate={setSelectedDate}
          />
          {selectedDate && (
            <ScheduleList
              date={selectedDate}
              performances={selectedPerformances}
              onPerformancePress={setSelectedPerformance}
            />
          )}
        </ScrollView>
      )}

      <ScheduleBottomSheet
        performance={selectedPerformance}
        onClose={() => setSelectedPerformance(null)}
        onDetail={(id) => {
          setSelectedPerformance(null);
          router.push(`/schedules/${id}`);
        }}
      />
    </YStack>
  );
}
