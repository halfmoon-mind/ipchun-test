import Link from "next/link";
import type { Schedule, ScheduleLineup } from "@ipchun/shared";

type ScheduleWithLineups = Schedule & {
  lineups: (ScheduleLineup & {
    artist: { id: string; name: string; imageUrl: string | null };
  })[];
};

const TYPE_LABELS: Record<string, string> = {
  CONCERT: "공연",
  BUSKING: "버스킹",
  FESTIVAL: "페스티벌",
  RELEASE: "발매",
  OTHER: "기타",
};

export function ScheduleCard({ schedule }: { schedule: ScheduleWithLineups }) {
  const date = new Date(schedule.startDate);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayStr = dayNames[date.getDay()];
  const artists = schedule.lineups.map((l) => l.artist.name).join(", ");

  return (
    <Link
      href={`/schedule/${schedule.id}`}
      className="block border-b px-4 py-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {date.getDate()}
          </div>
          <div className="text-xs text-muted-foreground">{dayStr}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {TYPE_LABELS[schedule.type] || schedule.type}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug truncate">
            {schedule.title}
          </h3>
          {artists && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {artists}
            </p>
          )}
          {schedule.location && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              📍 {schedule.location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
