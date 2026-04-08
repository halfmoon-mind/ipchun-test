'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Artist, Performance } from '@ipchun/shared';
import { SpotifyInfoSection } from '../_components/SpotifyInfoSection';

const genreLabels: Record<string, string> = {
  CONCERT: '콘서트',
  FESTIVAL: '페스티벌',
  MUSICAL: '뮤지컬',
  PLAY: '연극',
  CLASSIC: '클래식',
  BUSKING: '버스킹',
  RELEASE: '발매',
  OTHER: '기타',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: '예정',
  ON_SALE: '판매중',
  SOLD_OUT: '매진',
  COMPLETED: '종료',
  CANCELLED: '취소',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.artists.get(id),
      api.performances.list({ artistId: id }) as Promise<Performance[]>,
    ])
      .then(([a, p]) => {
        setArtist(a);
        setPerformances(p);
      })
      .catch(() => setError('아티스트 정보를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="empty-state">로딩 중...</p>;
  }

  if (error || !artist) {
    return (
      <div>
        <div className="alert-error mb-4">{error || '아티스트를 찾을 수 없습니다'}</div>
        <Link href="/artists" className="btn-text">
          &larr; 목록으로
        </Link>
      </div>
    );
  }

  const socialEntries = artist.socialLinks
    ? Object.entries(artist.socialLinks).filter(([key]) => key !== 'spotify')
    : [];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/artists" className="btn-text">
          &larr; 목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/artists/${id}/edit`} className="btn-primary">
            수정
          </Link>
          <button
            className="btn-destructive"
            disabled={deleting}
            onClick={async () => {
              if (!confirm(`"${artist.name}" 아티스트를 삭제하시겠습니까?`)) return;
              setDeleting(true);
              try {
                await api.artists.delete(id);
                router.push('/artists');
              } catch {
                alert('삭제에 실패했습니다');
                setDeleting(false);
              }
            }}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>

      {/* 아티스트 프로필 */}
      <div className="flex items-start gap-6 mb-8">
        {artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-24 h-24 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-3xl shrink-0">
            &#9835;
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="page-heading mb-1">{artist.name}</h1>
          {artist.description && (
            <p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>
              {artist.description}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {artist.spotifyUrl && (
              <a
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium"
                style={{ color: 'var(--spotify)' }}
              >
                Spotify
              </a>
            )}
            {socialEntries.map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm capitalize"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {key}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Spotify 정보 */}
      {artist.spotifyId && (
        <div className="mb-8 max-w-xl">
          <SpotifyInfoSection
            spotifyId={artist.spotifyId}
            spotifyLink={artist.spotifyUrl || ''}
            monthlyListeners={artist.monthlyListeners ?? null}
            spotifyMeta={artist.spotifyMeta ?? null}
          />
        </div>
      )}

      {/* 출연 공연 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          출연 공연
          {performances.length > 0 && (
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted-foreground)' }}>
              {performances.length}건
            </span>
          )}
        </h2>

        {performances.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            등록된 공연이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {performances.map((p) => (
              <Link
                key={p.id}
                href={`/performances/${p.id}`}
                className="flex gap-4 p-4 border hover:bg-[var(--secondary)] transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                {p.posterUrl && (
                  <img
                    src={p.posterUrl}
                    alt={p.title}
                    className="w-16 h-22 object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  {p.venue && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      {p.venue.name}
                    </p>
                  )}
                  {p.schedules.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      {formatDate(p.schedules[0].dateTime)}
                      {p.schedules.length > 1 && ` 외 ${p.schedules.length - 1}회`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 border"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                  >
                    {genreLabels[p.genre] || p.genre}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {statusLabels[p.status] || p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
