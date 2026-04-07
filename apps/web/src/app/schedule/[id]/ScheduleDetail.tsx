"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Performance, PerformanceArtistItem } from "@ipchun/shared";

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
  SCHEDULED: "예정",
  ON_SALE: "판매중",
  SOLD_OUT: "매진",
  COMPLETED: "종료",
  CANCELLED: "취소",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "var(--muted-foreground)",
  ON_SALE: "var(--color-success)",
  SOLD_OUT: "var(--destructive)",
  COMPLETED: "var(--muted-foreground)",
  CANCELLED: "var(--destructive)",
};

const PLATFORM_LABELS: Record<string, string> = {
  MELON: "멜론티켓",
  NOL: "NOL",
  TICKETLINK: "티켓링크",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}.${d.getDate()} (${dayNames[d.getDay()]})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ArtistRow({ entry }: { entry: PerformanceArtistItem }) {
  const name = entry.artist?.name ?? entry.stageName ?? "Unknown";
  const initial = name[0];

  const content = (
    <div className="flex items-center gap-3 py-2.5">
      {entry.startTime && (
        <span
          className="text-xs font-medium w-[90px] flex-shrink-0"
          style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}
        >
          {formatTime(entry.startTime)}
          {entry.endTime && ` – ${formatTime(entry.endTime)}`}
        </span>
      )}
      {entry.artist?.imageUrl ? (
        <img src={entry.artist.imageUrl} alt={name} className="w-8 h-8 object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {initial}
        </div>
      )}
      <span className="text-sm font-medium flex-1 min-w-0 truncate">{name}</span>
      {entry.artist?.id && (
        <svg
          className="flex-shrink-0"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );

  if (entry.artist?.id) {
    return (
      <Link
        href={`/artists/${entry.artist.id}`}
        className="block border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {content}
      </Link>
    );
  }
  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      {content}
    </div>
  );
}

function TimetableView({ performance }: { performance: Performance }) {
  const { schedules, artists } = performance;

  // Deduplicate days
  const uniqueDays = schedules.reduce<typeof schedules>((acc, s) => {
    const dateKey = toDateKey(s.dateTime);
    if (!acc.find((x) => toDateKey(x.dateTime) === dateKey)) {
      acc.push(s);
    }
    return acc;
  }, []);

  const [activeDay, setActiveDay] = useState(uniqueDays[0]?.id ?? "");
  const [activeStage, setActiveStage] = useState<string | null>(null);

  // Stages for the active day
  const dayStages = [
    ...new Set(
      artists
        .filter((a) => a.performanceScheduleId === activeDay && a.stage)
        .map((a) => a.stage!)
    ),
  ];

  // Auto-select first stage when day changes
  const currentStage = activeStage && dayStages.includes(activeStage) ? activeStage : dayStages[0] ?? null;

  // Artists for current day + stage, sorted by startTime (or performanceOrder)
  const stageArtists = artists
    .filter(
      (a) =>
        a.performanceScheduleId === activeDay &&
        (dayStages.length === 0 || a.stage === currentStage)
    )
    .sort((a, b) =>
      a.startTime && b.startTime
        ? new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        : (a.performanceOrder ?? 0) - (b.performanceOrder ?? 0)
    );

  return (
    <div>
      <h2
        className="text-sm font-bold mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        타임테이블
      </h2>

      {/* Day tabs */}
      {uniqueDays.length > 1 && (
        <div className="flex gap-0 mb-3 overflow-x-auto">
          {uniqueDays.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveDay(s.id);
                setActiveStage(null);
              }}
              className="px-4 py-2 text-xs font-medium whitespace-nowrap border transition-colors"
              style={{
                borderColor: activeDay === s.id ? "var(--foreground)" : "var(--border)",
                background: activeDay === s.id ? "var(--foreground)" : "transparent",
                color: activeDay === s.id ? "var(--background)" : "var(--muted-foreground)",
              }}
            >
              Day {i + 1} · {formatDayLabel(s.dateTime)}
            </button>
          ))}
        </div>
      )}

      {/* Stage tabs */}
      {dayStages.length > 1 && (
        <div className="flex gap-0 mb-3 overflow-x-auto">
          {dayStages.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className="px-3 py-1.5 text-xs whitespace-nowrap border transition-colors"
              style={{
                borderColor: currentStage === stage ? "var(--foreground)" : "var(--border)",
                background: currentStage === stage ? "var(--foreground)" : "transparent",
                color: currentStage === stage ? "var(--background)" : "var(--muted-foreground)",
                fontWeight: currentStage === stage ? 600 : 400,
              }}
            >
              {stage}
            </button>
          ))}
        </div>
      )}

      {/* Single stage label when only one */}
      {dayStages.length === 1 && (
        <div className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
          {dayStages[0]}
        </div>
      )}

      {/* Artist list */}
      {stageArtists.length > 0 ? (
        <div>
          {stageArtists.map((entry) => (
            <ArtistRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          배정된 아티스트가 없습니다.
        </p>
      )}
    </div>
  );
}

function LineupView({ artists }: { artists: PerformanceArtistItem[] }) {
  return (
    <div>
      <h2
        className="text-sm font-bold mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        라인업
      </h2>
      <div>
        {artists.map((entry) => (
          <ArtistRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default function ScheduleDetail({ performance }: { performance: Performance }) {
  const router = useRouter();

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 min-h-[44px] -ml-2 px-2 active:opacity-70 transition-opacity"
        aria-label="뒤로 가기"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* Genre & Status badges */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          {GENRE_LABELS[performance.genre] || performance.genre}
        </span>
        {performance.status && performance.status !== "SCHEDULED" && (
          <span
            className="text-xs font-bold"
            style={{ color: STATUS_COLORS[performance.status] ?? "var(--muted-foreground)" }}
          >
            {STATUS_LABELS[performance.status] ?? performance.status}
          </span>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-xl font-bold leading-tight mb-4"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {performance.title}
      </h1>

      {/* Poster */}
      {performance.posterUrl && (
        <div className="mb-6 flex justify-center" style={{ aspectRatio: "3/4", maxHeight: 280 }}>
          <img
            src={performance.posterUrl}
            alt={`${performance.title} 포스터`}
            className="max-h-[280px] max-w-full object-contain"
          />
        </div>
      )}

      {/* Info */}
      <div className="space-y-2 text-sm mb-6">
        {performance.schedules.length > 0 && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">날짜</span>
            <div>
              {performance.schedules.map((s) => (
                <div key={s.id}>{formatDateTime(s.dateTime)}</div>
              ))}
            </div>
          </div>
        )}
        {performance.venue && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">장소</span>
            <span>{performance.venue.name}</span>
          </div>
        )}
        {performance.venue?.address && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">주소</span>
            <span>{performance.venue.address}</span>
          </div>
        )}
        {performance.runtime && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">시간</span>
            <span>
              {performance.runtime}분
              {performance.intermission ? ` (인터미션 ${performance.intermission}분)` : ""}
            </span>
          </div>
        )}
        {performance.ageRating && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">등급</span>
            <span>{performance.ageRating}</span>
          </div>
        )}
        {performance.organizer && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">주최</span>
            <span>{performance.organizer}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {performance.description && (
        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          {performance.description}
        </p>
      )}

      {/* Artist lineup / timetable */}
      {performance.artists.length > 0 && (
        <div className="mb-6">
          {performance.lineupMode === "TIMETABLE" ? (
            <TimetableView performance={performance} />
          ) : (
            <LineupView artists={performance.artists} />
          )}
        </div>
      )}

      {/* Ticket info */}
      {performance.sources.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            예매
          </h2>
          <div className="space-y-3">
            {performance.sources.map((source) => (
              <div key={source.id}>
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 px-4 border"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--secondary)",
                  }}
                >
                  <div>
                    <div className="text-sm font-bold">
                      {PLATFORM_LABELS[source.platform] ?? source.platform}
                    </div>
                    {source.salesStatus && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {source.salesStatus}
                      </div>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </a>

                {/* Ticket open date */}
                {source.ticketOpenAt && (
                  <div className="text-xs text-muted-foreground mt-1 px-1">
                    티켓 오픈: {formatDateTime(source.ticketOpenAt)}
                  </div>
                )}

                {/* Prices */}
                {source.tickets.length > 0 && (
                  <div className="mt-2 px-1 space-y-0.5">
                    {source.tickets.map((ticket) => (
                      <div key={ticket.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{ticket.seatGrade}</span>
                        <span className="font-medium">{formatPrice(ticket.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
