"use client";

import type { Performance } from "@ipchun/shared";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleListProps {
  performances: Performance[];
  selectedDate: string | null;
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleList({ performances, selectedDate }: ScheduleListProps) {
  const filtered = selectedDate
    ? performances.filter((p) =>
        p.schedules.some((s) => toDateKey(s.dateTime) === selectedDate),
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
