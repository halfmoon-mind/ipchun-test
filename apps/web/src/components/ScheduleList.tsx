"use client";

import { useRef, useEffect } from "react";
import type { Schedule, ScheduleLineup } from "@ipchun/shared";
import { ScheduleCard } from "./ScheduleCard";

type ScheduleWithLineups = Schedule & {
  lineups: (ScheduleLineup & {
    artist: { id: string; name: string; imageUrl: string | null };
  })[];
};

interface ScheduleListProps {
  schedules: ScheduleWithLineups[];
  selectedDate: string | null;
}

export function ScheduleList({ schedules, selectedDate }: ScheduleListProps) {
  const closestRef = useRef<HTMLDivElement>(null);

  const filtered = selectedDate
    ? schedules.filter((s) => {
        const start = s.startDate.slice(0, 10);
        const end = s.endDate ? s.endDate.slice(0, 10) : start;
        return selectedDate >= start && selectedDate <= end;
      })
    : schedules;

  const todayStr = new Date().toISOString().slice(0, 10);

  let closestIndex = -1;
  if (!selectedDate && filtered.length > 0) {
    // Find the first upcoming schedule (startDate >= today)
    closestIndex = filtered.findIndex(
      (s) => s.startDate.slice(0, 10) >= todayStr
    );
    // If all are past, point to the last one
    if (closestIndex === -1) {
      closestIndex = filtered.length - 1;
    }
  }

  useEffect(() => {
    if (!selectedDate && closestRef.current) {
      // Delay slightly so the DOM is fully laid out
      requestAnimationFrame(() => {
        closestRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    }
  }, [selectedDate, schedules]);

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {selectedDate ? "이 날짜에 일정이 없습니다" : "이번 달 일정이 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((schedule, i) => (
        <div key={schedule.id} ref={i === closestIndex ? closestRef : undefined}>
          <ScheduleCard schedule={schedule} />
        </div>
      ))}
    </div>
  );
}
