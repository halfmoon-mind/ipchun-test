"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar } from "@/components/Calendar";
import { ScheduleList } from "@/components/ScheduleList";
import { api, type CalendarResponse } from "@/lib/api";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const selectedDate = searchParams.get("date");

  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.calendar(year, month).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [year, month]);

  const updateParams = useCallback(
    (params: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `?${qs}` : "/");
    },
    [router, searchParams],
  );

  const handleChangeMonth = (y: number, m: number) => {
    updateParams({ year: String(y), month: String(m), date: null });
  };

  const handleSelectDate = (date: string | null) => {
    updateParams({ date });
  };

  return (
    <div>
      {/* Calendar */}
      <Calendar
        year={year}
        month={month}
        dates={data?.dates ?? {}}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
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
            performances={data?.performances ?? []}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          불러오는 중...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
