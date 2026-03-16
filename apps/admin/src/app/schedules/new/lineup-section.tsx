'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Artist } from '@ipchun/shared';
import type { ExtractedLineup } from '@/app/api/ocr-lineup/route';

export interface LineupEntry {
  artistName: string;
  artistId: string;
  stageName: string;
  startTime: string;
  endTime: string;
  performanceOrder: number | null;
}

interface LineupSectionProps {
  images: string[];
  lineups: LineupEntry[];
  onLineupsChange: (lineups: LineupEntry[]) => void;
}

export default function LineupSection({ images, lineups, onLineupsChange }: LineupSectionProps) {
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [artistCache, setArtistCache] = useState<Artist[]>([]);

  useEffect(() => {
    api.artists.list().then(setArtistCache).catch(() => {});
  }, []);

  function toggleImage(url: string) {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }

  function findArtistId(name: string): string {
    const normalized = name.trim().toLowerCase();
    const match = artistCache.find(
      (a) => a.name.toLowerCase() === normalized,
    );
    return match?.id || '';
  }

  async function handleExtract() {
    if (selectedImages.length === 0) return;
    setExtracting(true);
    setError(null);
    try {
      const { lineup } = await api.ocr.lineup(selectedImages);
      const entries: LineupEntry[] = lineup.map((l: ExtractedLineup) => ({
        artistName: l.artistName,
        artistId: findArtistId(l.artistName),
        stageName: l.stageName || '',
        startTime: l.startTime || '',
        endTime: l.endTime || '',
        performanceOrder: l.performanceOrder,
      }));
      onLineupsChange([...lineups, ...entries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR 추출에 실패했습니다');
    } finally {
      setExtracting(false);
    }
  }

  function updateEntry(index: number, field: keyof LineupEntry, value: string | number | null) {
    const updated = [...lineups];
    updated[index] = { ...updated[index], [field]: value };
    onLineupsChange(updated);
  }

  function removeEntry(index: number) {
    onLineupsChange(lineups.filter((_, i) => i !== index));
  }

  function addEmptyEntry() {
    onLineupsChange([
      ...lineups,
      { artistName: '', artistId: '', stageName: '', startTime: '', endTime: '', performanceOrder: null },
    ]);
  }

  if (images.length === 0 && lineups.length === 0) return null;

  return (
    <div className="max-w-xl mt-8 p-4 border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">라인업 / 타임테이블</h2>

      {error && <div className="alert-error mb-4">{error}</div>}

      {images.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            라인업이 포함된 이미지를 선택한 후 OCR 추출 버튼을 눌러주세요.
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {images.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => toggleImage(url)}
                className={`relative border-2 rounded overflow-hidden aspect-square ${
                  selectedImages.includes(url)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {selectedImages.includes(url) && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || selectedImages.length === 0}
            className="btn-primary"
          >
            {extracting ? 'OCR 추출 중...' : `선택한 이미지에서 라인업 추출 (${selectedImages.length}장)`}
          </button>
        </div>
      )}

      {lineups.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">아티스트</th>
                <th className="py-2 pr-2">매칭</th>
                <th className="py-2 pr-2">스테이지</th>
                <th className="py-2 pr-2">시작</th>
                <th className="py-2 pr-2">종료</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lineups.map((entry, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.artistName}
                      onChange={(e) => updateEntry(i, 'artistName', e.target.value)}
                      className="form-input py-1 text-sm"
                      placeholder="아티스트명"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={entry.artistId}
                      onChange={(e) => updateEntry(i, 'artistId', e.target.value)}
                      className={`form-input py-1 text-sm ${!entry.artistId ? 'text-red-400' : ''}`}
                    >
                      <option value="">미매칭</option>
                      {artistCache.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.stageName}
                      onChange={(e) => updateEntry(i, 'stageName', e.target.value)}
                      className="form-input py-1 text-sm w-20"
                      placeholder="스테이지"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.startTime}
                      onChange={(e) => updateEntry(i, 'startTime', e.target.value)}
                      className="form-input py-1 text-sm w-16"
                      placeholder="HH:mm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={entry.endTime}
                      onChange={(e) => updateEntry(i, 'endTime', e.target.value)}
                      className="form-input py-1 text-sm w-16"
                      placeholder="HH:mm"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addEmptyEntry}
        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
      >
        + 라인업 수동 추가
      </button>
    </div>
  );
}
