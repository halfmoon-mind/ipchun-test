import { useState, useEffect, useCallback } from 'react';
import { YStack, Text, ScrollView, Spinner } from 'tamagui';
import { CalendarHeader } from '../../src/components/calendar/CalendarHeader';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';
import { ScheduleList } from '../../src/components/calendar/ScheduleList';
import { ScheduleBottomSheet } from '../../src/components/calendar/ScheduleBottomSheet';
import { api } from '../../src/api/client';
import type { CalendarResponse, CalendarPerformance } from '../../src/api/client';
import { useRouter } from 'expo-router';

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
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<CalendarPerformance | null>(null);

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.performances.getCalendar(y, m);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const selectedPerformances = selectedDate && data
    ? getPerformancesForDate(data.performances, selectedDate)
    : [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <CalendarHeader year={year} month={month} onPrev={handlePrev} onNext={handleNext} />

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
            dates={data?.dates ?? {}}
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
