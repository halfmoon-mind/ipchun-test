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
  const filtered = selectedDate
    ? schedules.filter((s) => {
        const start = s.startDate.slice(0, 10);
        const end = s.endDate ? s.endDate.slice(0, 10) : start;
        return selectedDate >= start && selectedDate <= end;
      })
    : schedules;

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {selectedDate ? "이 날짜에 일정이 없습니다" : "이번 달 일정이 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((schedule) => (
        <ScheduleCard key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}
