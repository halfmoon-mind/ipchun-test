interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** 캘린더 로딩 스켈레톤 */
export function CalendarSkeleton() {
  return (
    <div className="px-4 py-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9" />
        <Skeleton className="h-5 w-24" />
        <div className="w-9 h-9" />
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-center py-1">
            <Skeleton className="h-3 w-4" />
          </div>
        ))}
      </div>

      {/* Day grid — 5 rows */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="flex justify-center py-2">
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 스케줄 카드 1개 스켈레톤 */
export function ScheduleCardSkeleton() {
  return (
    <div
      className="block border-b px-4 py-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-12 flex flex-col items-center gap-1">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-3 w-4" />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

/** 스케줄 리스트 스켈레톤 (카드 N개) */
export function ScheduleListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ScheduleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** 공연 상세 스켈레톤 */
export function ScheduleDetailSkeleton() {
  return (
    <div className="px-4 pt-6 pb-6">
      {/* Back button */}
      <Skeleton className="h-5 w-10 mb-4" />

      {/* Genre badge */}
      <Skeleton className="h-3 w-16 mb-2" />

      {/* Title */}
      <Skeleton className="h-7 w-4/5 mb-4" />

      {/* Poster */}
      <div className="mb-6 flex justify-center">
        <Skeleton style={{ width: 210, height: 280 }} />
      </div>

      {/* Info rows */}
      <div className="space-y-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-4 w-12 flex-shrink-0" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>

      {/* Lineup */}
      <Skeleton className="h-4 w-12 mb-3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Skeleton className="w-8 h-8 flex-shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** 아티스트 카드 스켈레톤 */
export function ArtistCardSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <Skeleton className="w-11 h-11 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-8 flex-shrink-0" />
    </div>
  );
}

/** 아티스트 리스트 스켈레톤 */
export function ArtistListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {/* Search skeleton */}
      <div className="px-4 py-3">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="px-4 pb-2">
        <Skeleton className="h-3 w-24" />
      </div>
      {/* Cards */}
      <div
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <ArtistCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** 아티스트 상세 스켈레톤 */
export function ArtistDetailSkeleton() {
  return (
    <div className="px-4 py-6">
      {/* Back button */}
      <Skeleton className="h-5 w-10 mb-6" />

      {/* Hero image */}
      <div className="-mx-4 mb-4">
        <Skeleton className="w-full" style={{ height: 192 }} />
      </div>

      {/* Name */}
      <Skeleton className="h-7 w-1/2 mb-2" />

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Description */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>

      {/* Section: upcoming */}
      <Skeleton className="h-4 w-20 mb-3" />
      {Array.from({ length: 2 }).map((_, i) => (
        <ScheduleCardSkeleton key={i} />
      ))}
    </div>
  );
}
