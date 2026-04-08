'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Artist, Performance } from '@ipchun/shared';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function DashboardPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [upcomingPerformances, setUpcomingPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.artists.list(),
      api.performances.list(),
      api.performances.list({ period: 'upcoming' }),
    ])
      .then(([a, p, u]) => {
        setArtists(a);
        setPerformances(p as Performance[]);
        setUpcomingPerformances(u as Performance[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const recentArtists = [...artists]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const nextSchedules = upcomingPerformances.slice(0, 5);

  return (
    <div>
      <h1 className="page-heading mb-8">대시보드</h1>

      <div className="grid grid-cols-3 gap-5">
        <Link href="/artists" className="card p-6 hover:opacity-80 transition-opacity">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            아티스트
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {loading ? '–' : artists.length}
          </p>
        </Link>
        <Link href="/performances" className="card p-6 hover:opacity-80 transition-opacity">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            공연
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {loading ? '–' : performances.length}
          </p>
        </Link>
        <div className="card p-6">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            다가오는 일정
          </p>
          <p className="text-[32px] font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {loading ? '–' : upcomingPerformances.length}
          </p>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 gap-5 mt-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                최근 등록 아티스트
              </h2>
              <Link href="/artists" className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                전체 보기 →
              </Link>
            </div>
            {recentArtists.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>등록된 아티스트가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="card px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {artist.name[0]}
                      </div>
                    )}
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {artist.name}
                    </span>
                    <span className="ml-auto text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(artist.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                다가오는 공연
              </h2>
              <Link href="/performances" className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                전체 보기 →
              </Link>
            </div>
            {nextSchedules.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>다가오는 공연이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {nextSchedules.map((perf) => (
                  <Link
                    key={perf.id}
                    href={`/performances/${perf.id}`}
                    className="card px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {perf.posterUrl ? (
                      <img
                        src={perf.posterUrl}
                        alt={perf.title}
                        className="w-8 h-10 object-cover"
                        style={{ borderRadius: 0 }}
                      />
                    ) : (
                      <div
                        className="w-8 h-10 flex items-center justify-center text-[10px]"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        공연
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {perf.title}
                      </span>
                      {perf.schedules?.[0] && (
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(perf.schedules[0].dateTime)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
