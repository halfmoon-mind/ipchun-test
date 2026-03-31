import Link from "next/link";
import type { Performance } from "@ipchun/shared";

const GENRE_LABELS: Record<string, string> = {
  CONCERT: "공연",
  MUSICAL: "뮤지컬",
  PLAY: "연극",
  CLASSIC: "클래식",
  FESTIVAL: "페스티벌",
  BUSKING: "버스킹",
  RELEASE: "발매",
  OTHER: "기타",
};

const STATUS_LABELS: Record<string, string> = {
  ON_SALE: "판매중",
  SOLD_OUT: "매진",
  CANCELLED: "취소",
};

const STATUS_COLORS: Record<string, string> = {
  ON_SALE: "var(--color-success)",
  SOLD_OUT: "var(--destructive)",
  CANCELLED: "var(--destructive)",
};

export function ScheduleCard({ performance }: { performance: Performance }) {
  const firstSchedule = performance.schedules[0];
  const date = firstSchedule ? new Date(firstSchedule.dateTime) : new Date();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayStr = dayNames[date.getDay()];
  const artists = performance.artists.map((a) => a.artist?.name ?? a.stageName ?? "").filter(Boolean).join(", ");

  return (
    <Link
      href={`/schedule/${performance.id}`}
      className="block border-b px-4 py-4 active:opacity-70 transition-opacity"
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
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {GENRE_LABELS[performance.genre] || performance.genre}
            </span>
            {performance.status && STATUS_LABELS[performance.status] && (
              <span
                className="text-xs font-bold"
                style={{ color: STATUS_COLORS[performance.status] }}
              >
                {STATUS_LABELS[performance.status]}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold leading-snug truncate">
            {performance.title}
          </h3>
          {artists && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {artists}
            </p>
          )}
          {performance.venue && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {performance.venue.name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
