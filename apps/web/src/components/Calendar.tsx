"use client";

interface CalendarProps {
  year: number;
  month: number;
  dates: Record<string, string[]>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onChangeMonth: (year: number, month: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function Calendar({
  year,
  month,
  dates,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: CalendarProps) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="px-4 py-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 text-muted-foreground"
          aria-label="이전 달"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2
          className="text-base font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {year}년 {month}월
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 text-muted-foreground"
          aria-label="다음 달"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasSchedule = !!dates[dateStr];
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              aria-label={`${month}월 ${day}일${hasSchedule ? ", 일정 있음" : ""}${isSelected ? ", 선택됨" : ""}`}
              className={`
                relative flex flex-col items-center justify-center py-2 text-sm
                ${isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                ${!isSelected && hasSchedule ? "font-semibold" : ""}
                ${!isSelected && !hasSchedule ? "text-muted-foreground" : ""}
              `}
              style={isSelected ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
            >
              {day}
              {hasSchedule && !isSelected && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
