'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Performance } from '@ipchun/shared';

const platformLabels: Record<string, string> = {
  MELON: '멜론',
  NOL: 'NOL',
  TICKETLINK: '티켓링크',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function PerformancesPage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.performances
      .list()
      .then(setPerformances)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">공연</h1>
        <Link href="/performances/new" className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 공연 등록
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>
      ) : performances.length === 0 ? (
        <div className="card">
          <p className="empty-state">등록된 공연이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {performances.map((p) => (
            <div
              key={p.id}
              className="flex gap-4 p-4 border"
              style={{ borderColor: 'var(--border)' }}
            >
              {p.posterUrl && (
                <img
                  src={p.posterUrl}
                  alt={p.title}
                  className="w-20 h-28 object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{p.title}</h3>
                {p.venue && (
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    {p.venue.name}
                  </p>
                )}
                {p.schedules.length > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    {formatDate(p.schedules[0].dateTime)}
                    {p.schedules.length > 1 && ` 외 ${p.schedules.length - 1}회`}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {p.sources.map((s) => (
                    <a
                      key={s.id}
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-0.5 text-xs border"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {platformLabels[s.platform] || s.platform}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between items-end shrink-0">
                <span className="text-xs px-2 py-0.5 border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  {p.genre}
                </span>
                {p.sources[0]?.tickets?.[0] && (
                  <span className="text-sm font-medium">
                    {p.sources[0].tickets[0].price.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
