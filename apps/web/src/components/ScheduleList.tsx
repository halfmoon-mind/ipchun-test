"use client";

import type { Performance } from "@ipchun/shared";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleListProps {
  performances: Performance[];
  selectedDate: string | null;
}

export function ScheduleList({ performances, selectedDate }: ScheduleListProps) {
  const filtered = selectedDate
    ? performances.filter((p) =>
        p.schedules.some((s) => s.dateTime.slice(0, 10) === selectedDate),
      )
    : performances;

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {selectedDate ? "이 날짜에 일정이 없습니다" : "이번 달 일정이 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((performance) => (
        <div key={performance.id}>
          <ScheduleCard performance={performance} selectedDate={selectedDate} />
        </div>
      ))}
    </div>
  );
}
