import { YStack, XStack, Text } from 'tamagui';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate: string | null;
  dates: Record<string, string[]>;
  onSelectDate: (date: string) => void;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const prevMonthLast = new Date(year, month - 1, 0).getDate();

  const days: Array<{ day: number; month: number; year: number }> = [];

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month - 1 <= 0 ? 12 : month - 1;
    const y = month - 1 <= 0 ? year - 1 : year;
    days.push({ day: d, month: m, year: y });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, month, year });
  }

  // Next month days (fill to 42 = 6 weeks)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1 > 12 ? 1 : month + 1;
    const y = month + 1 > 12 ? year + 1 : year;
    days.push({ day: d, month: m, year: y });
  }

  return days;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarGrid({ year, month, selectedDate, dates, onSelectDate }: CalendarGridProps) {
  const days = getCalendarDays(year, month);
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <YStack>
      {/* Weekday header */}
      <XStack>
        {WEEKDAYS.map((wd) => (
          <YStack key={wd} flex={1} alignItems="center" paddingVertical="$1">
            <Text fontSize={12} fontFamily="$body" color="$colorSecondary">{wd}</Text>
          </YStack>
        ))}
      </XStack>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <XStack key={wi}>
          {week.map((d, di) => {
            const dateKey = formatDateKey(d.year, d.month, d.day);
            return (
              <CalendarDayCell
                key={di}
                day={d.day}
                isCurrentMonth={d.month === month && d.year === year}
                isToday={dateKey === todayKey}
                isSelected={dateKey === selectedDate}
                types={dates[dateKey] ?? []}
                onPress={() => onSelectDate(dateKey)}
              />
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
}
