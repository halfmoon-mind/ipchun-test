'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Performance } from '@ipchun/shared';

const genreLabels: Record<string, string> = {
  CONCERT: '콘서트', MUSICAL: '뮤지컬', PLAY: '연극', CLASSIC: '클래식',
  FESTIVAL: '페스티벌', BUSKING: '버스킹', RELEASE: '발매', OTHER: '기타',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: '예정', ON_SALE: '판매중', SOLD_OUT: '매진', COMPLETED: '종료', CANCELLED: '취소',
};

const platformLabels: Record<string, string> = {
  MELON: '멜론', NOL: 'NOL', TICKETLINK: '티켓링크',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PerformanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.performances.get(id)
      .then(setPerformance)
      .catch(() => setError('공연 정보를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!performance) return;
    if (!confirm(`정말 "${performance.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api.performances.delete(id);
      router.push('/performances');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  }

  if (loading) return <p style={{ color: 'var(--muted-foreground)' }}>불러오는 중...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!performance) return <div className="alert-error">공연을 찾을 수 없습니다</div>;

  const source = performance.sources[0];

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">{performance.title}</h1>
        <div className="flex gap-2">
          <Link href={`/performances/${id}/edit`} className="btn-primary">수정</Link>
          <button onClick={handleDelete} className="btn-secondary" style={{ color: 'var(--destructive)' }}>삭제</button>
        </div>
      </div>

      {performance.subtitle && (
        <p className="text-base mb-6" style={{ color: 'var(--muted-foreground)' }}>{performance.subtitle}</p>
      )}

      <div className="space-y-8">
        {/* 포스터 + 기본 정보 */}
        <section className="flex gap-6">
          {performance.posterUrl && (
            <img
              src={performance.posterUrl}
              alt={performance.title}
              className="w-40 h-56 object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="space-y-2 text-sm">
            <p><span style={{ color: 'var(--muted-foreground)' }}>장르:</span> {genreLabels[performance.genre] || performance.genre}</p>
            <p><span style={{ color: 'var(--muted-foreground)' }}>상태:</span> {statusLabels[performance.status] || performance.status}</p>
            {performance.ageRating && <p><span style={{ color: 'var(--muted-foreground)' }}>관람등급:</span> {performance.ageRating}</p>}
            {performance.runtime && <p><span style={{ color: 'var(--muted-foreground)' }}>러닝타임:</span> {performance.runtime}분</p>}
            {performance.intermission && <p><span style={{ color: 'var(--muted-foreground)' }}>인터미션:</span> {performance.intermission}분</p>}
            {performance.organizer && <p><span style={{ color: 'var(--muted-foreground)' }}>주최:</span> {performance.organizer}</p>}
          </div>
        </section>

        {/* 설명 */}
        {performance.description && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>설명</h2>
            <p className="text-sm whitespace-pre-wrap">{performance.description}</p>
          </section>
        )}

        {/* 장소 */}
        {performance.venue && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>장소</h2>
            <p className="text-sm">{performance.venue.name}</p>
            {performance.venue.address && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{performance.venue.address}</p>
            )}
          </section>
        )}

        {/* 회차 */}
        {performance.schedules.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>회차</h2>
            <div className="space-y-1">
              {performance.schedules.map((s) => (
                <p key={s.id} className="text-sm">{formatDateTime(s.dateTime)}</p>
              ))}
            </div>
          </section>
        )}

        {/* 티켓 */}
        {source?.tickets && source.tickets.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>가격</h2>
            <div className="space-y-1">
              {source.tickets.map((t) => (
                <p key={t.id} className="text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>{t.seatGrade}:</span> {t.price.toLocaleString()}원
                </p>
              ))}
            </div>
          </section>
        )}

        {/* 출처 */}
        {source && (
          <section className="p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>출처</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span style={{ color: 'var(--muted-foreground)' }}>플랫폼:</span> {platformLabels[source.platform] || source.platform}</p>
              {source.ticketOpenAt && (
                <p><span style={{ color: 'var(--muted-foreground)' }}>예매 오픈:</span> {formatDateTime(source.ticketOpenAt)}</p>
              )}
              <p className="col-span-2">
                <span style={{ color: 'var(--muted-foreground)' }}>URL:</span>{' '}
                <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{source.sourceUrl}</a>
              </p>
            </div>
          </section>
        )}

        {/* 아티스트 라인업 */}
        {performance.artists.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>아티스트 라인업</h2>
            <div className="space-y-2">
              {performance.artists.map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{a.artist?.name ?? a.stageName ?? 'Unknown'}</span>
                  {a.role && <span style={{ color: 'var(--muted-foreground)' }}>({a.role})</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
