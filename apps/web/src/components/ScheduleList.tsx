"use client";

import { useRef, useEffect } from "react";
import type { Performance } from "@ipchun/shared";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleListProps {
  performances: Performance[];
  selectedDate: string | null;
}

export function ScheduleList({ performances, selectedDate }: ScheduleListProps) {
  const closestRef = useRef<HTMLDivElement>(null);

  const filtered = selectedDate
    ? performances.filter((p) =>
        p.schedules.some((s) => s.dateTime.slice(0, 10) === selectedDate),
      )
    : performances;

  const todayStr = new Date().toISOString().slice(0, 10);

  let closestIndex = -1;
  if (!selectedDate && filtered.length > 0) {
    closestIndex = filtered.findIndex((p) =>
      p.schedules.some((s) => s.dateTime.slice(0, 10) >= todayStr),
    );
    if (closestIndex === -1) {
      closestIndex = filtered.length - 1;
    }
  }

  useEffect(() => {
    if (!selectedDate && closestRef.current) {
      requestAnimationFrame(() => {
        closestRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    }
  }, [selectedDate, performances]);

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {selectedDate ? "이 날짜에 일정이 없습니다" : "이번 달 일정이 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((performance, i) => (
        <div key={performance.id} ref={i === closestIndex ? closestRef : undefined}>
          <ScheduleCard performance={performance} selectedDate={selectedDate} />
        </div>
      ))}
    </div>
  );
}
