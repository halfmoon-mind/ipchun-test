"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/Calendar";
import { ScheduleList } from "@/components/ScheduleList";
import { api, type CalendarResponse } from "@/lib/api";

export default function HomePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.calendar(year, month).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [year, month]);

  const handleChangeMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setSelectedDate(null);
  };

  return (
    <div>
      {/* Calendar */}
      <Calendar
        year={year}
        month={month}
        dates={data?.dates ?? {}}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onChangeMonth={handleChangeMonth}
      />

      {/* Divider */}
      <div
        className="h-px mx-4"
        style={{ background: "var(--border)" }}
      />

      {/* Schedule list */}
      <div className="pb-8">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : (
          <ScheduleList
            schedules={data?.schedules ?? []}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
}
