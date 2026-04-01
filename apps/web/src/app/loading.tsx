import { CalendarSkeleton, ScheduleListSkeleton } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div>
      <CalendarSkeleton />
      <div className="h-px mx-4" style={{ background: "var(--border)" }} />
      <div className="pb-8">
        <ScheduleListSkeleton />
      </div>
    </div>
  );
}
