"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
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

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.performance(id).then((res) => {
      setPerformance(res);
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

  if (!performance) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        공연을 찾을 수 없습니다
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        뒤로
      </button>

      {/* Genre & Status badges */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          {GENRE_LABELS[performance.genre] || performance.genre}
        </span>
        {performance.status && performance.status !== "SCHEDULED" && (
          <span
            className="text-[10px] font-bold"
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
        <div className="mb-6 flex justify-center">
          <img
            src={performance.posterUrl}
            alt={performance.title}
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

      {/* Artist lineup */}
      {performance.artists.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            라인업
          </h2>
          <div className="space-y-2">
            {performance.artists.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {entry.artist?.imageUrl ? (
                  <img
                    src={entry.artist.imageUrl}
                    alt={entry.artist.name}
                    className="w-8 h-8 object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {(entry.artist?.name ?? entry.stageName ?? "?")[0]}
                  </div>
                )}
                <span className="text-sm font-medium">
                  {entry.artist?.name ?? entry.stageName ?? "Unknown"}
                </span>
              </div>
            ))}
          </div>
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
