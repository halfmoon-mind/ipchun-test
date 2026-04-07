'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.artists.list().then(setArtists).finally(() => setLoading(false));
  }, []);

  const allSelected = artists.length > 0 && selectedIds.size === artists.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(artists.map((a) => a.id)));
  }

  async function handleBulkDelete() {
    if (!confirm(`선택한 ${selectedIds.size}명의 아티스트를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await api.artists.bulkDelete([...selectedIds]);
      setArtists((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch {
      alert('삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-heading">아티스트</h1>
        <Link href="/artists/new" className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 아티스트 등록
        </Link>
      </div>

      {someSelected && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 mb-4 bg-[var(--background)] border border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm font-medium">
              {selectedIds.size}명 선택됨
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="btn-text text-sm">
              선택 해제
            </button>
            <button onClick={handleBulkDelete} disabled={deleting} className="btn-text-danger text-sm">
              {deleting ? '삭제 중...' : '선택 삭제'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="empty-state">로딩 중...</p>
        </div>
      ) : artists.length === 0 ? (
        <div className="card">
          <p className="empty-state">등록된 아티스트가 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className={`card flex items-center gap-4 p-4 transition-colors ${
                selectedIds.has(artist.id) ? 'bg-[var(--secondary)]' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(artist.id)}
                onChange={() => toggleSelect(artist.id)}
                className="w-4 h-4 shrink-0 accent-[var(--primary)]"
              />
              <Link
                href={`/artists/${artist.id}`}
                className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
              >
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
                    &#9835;
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{artist.name}</h2>
                  {artist.description && (
                    <p className="text-sm text-gray-500 truncate max-w-md">{artist.description}</p>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-3">
                {artist.spotifyUrl && (
                  <span
                    role="link"
                    onClick={() => window.open(artist.spotifyUrl!, '_blank', 'noopener,noreferrer')}
                    className="text-green-600 hover:text-green-800 text-sm cursor-pointer"
                  >
                    Spotify
                  </span>
                )}
                {artist.socialLinks &&
                  Object.entries(artist.socialLinks)
                    .filter(([key]) => key !== 'spotify')
                    .map(([key, url]) => (
                      <span
                        key={key}
                        role="link"
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        className="text-gray-600 hover:text-gray-900 text-sm capitalize cursor-pointer"
                      >
                        {key}
                      </span>
                    ))}
                <Link
                  href={`/artists/${artist.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  수정
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
