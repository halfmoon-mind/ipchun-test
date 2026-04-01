"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar } from "@/components/Calendar";
import { ScheduleList } from "@/components/ScheduleList";
import { api, type CalendarResponse } from "@/lib/api";

interface HomeContentProps {
  initialData: CalendarResponse;
  year: number;
  month: number;
  selectedDate: string | null;
}

export function HomeContent({
  initialData,
  year: initialYear,
  month: initialMonth,
  selectedDate: initialSelectedDate,
}: HomeContentProps) {
  const searchParams = useSearchParams();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  // Skip the sync effect when the URL change originated from our own code
  const skipNextSync = useRef(false);
  const stateRef = useRef({ year: initialYear, month: initialMonth, selectedDate: initialSelectedDate });
  stateRef.current = { year, month, selectedDate };

  function syncUrl(y: number, m: number, date: string | null) {
    skipNextSync.current = true;
    const sp = new URLSearchParams();
    sp.set("year", String(y));
    sp.set("month", String(m));
    if (date) sp.set("date", date);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/");
  }

  // Respond to external URL changes (home button, browser back/forward)
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    const pYear = Number(searchParams.get("year")) || null;
    const pMonth = Number(searchParams.get("month")) || null;
    const pDate = searchParams.get("date") ?? null;

    const now = new Date();
    const targetYear = pYear || now.getFullYear();
    const targetMonth = pMonth || (now.getMonth() + 1);

    const cur = stateRef.current;
    if (targetYear === cur.year && targetMonth === cur.month && pDate === cur.selectedDate) return;

    setYear(targetYear);
    setMonth(targetMonth);
    setSelectedDate(pDate);

    if (targetYear !== cur.year || targetMonth !== cur.month) {
      startTransition(async () => {
        setData(await api.calendar(targetYear, targetMonth));
      });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch adjacent months into client cache
  useEffect(() => {
    const prev =
      month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const next =
      month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    api.calendar(prev.y, prev.m);
    api.calendar(next.y, next.m);
  }, [year, month]);

  const handleChangeMonth = useCallback(
    (y: number, m: number) => {
      setYear(y);
      setMonth(m);
      setSelectedDate(null);
      syncUrl(y, m, null);
      startTransition(async () => {
        const newData = await api.calendar(y, m);
        setData(newData);
      });
    },
    [],
  );

  const handleSelectDate = useCallback(
    (date: string | null) => {
      setSelectedDate(date);
      syncUrl(year, month, date);
    },
    [year, month],
  );

  return (
    <div>
      <Calendar
        year={year}
        month={month}
        dates={data.dates}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onChangeMonth={handleChangeMonth}
      />

      <div className="h-px mx-4" style={{ background: "var(--border)" }} />

      <div className="pb-8">
        <ScheduleList
          performances={data.performances}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
