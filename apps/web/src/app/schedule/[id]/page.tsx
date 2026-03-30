"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Schedule, ScheduleLineup } from "@ipchun/shared";

type ScheduleDetail = Schedule & {
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

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.schedule(id).then((res) => {
      setSchedule(res);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        일정을 찾을 수 없습니다
      </div>
    );
  }

  const startDate = new Date(schedule.startDate);
  const formatDate = (d: Date) =>
    `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* Type badge */}
      <div
        className="text-[10px] font-semibold tracking-wider uppercase mb-2"
        style={{ color: "var(--muted-foreground)" }}
      >
        {TYPE_LABELS[schedule.type] || schedule.type}
      </div>

      {/* Title */}
      <h1
        className="text-xl font-bold leading-tight mb-4"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {schedule.title}
      </h1>

      {/* Info */}
      <div className="space-y-2 text-sm mb-6">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-12 flex-shrink-0">날짜</span>
          <span>{formatDate(startDate)}</span>
        </div>
        {schedule.location && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">장소</span>
            <span>{schedule.location}</span>
          </div>
        )}
        {schedule.address && (
          <div className="flex gap-2">
            <span className="text-muted-foreground w-12 flex-shrink-0">주소</span>
            <span>{schedule.address}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {schedule.description && (
        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          {schedule.description}
        </p>
      )}

      {/* Lineup */}
      {schedule.lineups.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            라인업
          </h2>
          <div className="space-y-2">
            {schedule.lineups.map((lineup) => (
              <div
                key={lineup.id}
                className="flex items-center gap-3 py-2 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {lineup.artist.imageUrl ? (
                  <img
                    src={lineup.artist.imageUrl}
                    alt={lineup.artist.name}
                    className="w-8 h-8 object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {lineup.artist.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium">{lineup.artist.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
