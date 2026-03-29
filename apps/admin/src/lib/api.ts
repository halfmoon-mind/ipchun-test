import type { Artist, Schedule, SpotifyMeta } from '@ipchun/shared';
import type { ScrapedSchedule } from '@/app/api/scrape-schedule/parsers/types';
import type { ExtractedLineup } from '@/app/api/ocr-lineup/route';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  artists: {
    list: (search?: string) =>
      request<Artist[]>(
        `/artists${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
    get: (id: string) => request<Artist>(`/artists/${id}`),
    create: (data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<Artist>('/artists', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>>) =>
      request<Artist>(`/artists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/artists/${id}`, { method: 'DELETE' }),
  },
  schedules: {
    list: (artistId?: string) =>
      request<Schedule[]>(
        `/schedules${artistId ? `?artistId=${artistId}` : ''}`,
      ),
    get: (id: string) => request<Schedule>(`/schedules/${id}`),
    create: (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<Schedule>('/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Schedule, 'id' | 'artistId' | 'createdAt' | 'updatedAt'>>) =>
      request<Schedule>(`/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/schedules/${id}`, { method: 'DELETE' }),
    replaceLineups: (scheduleId: string, lineups: Array<{
      artistId: string;
      stageName?: string;
      startTime?: string;
      endTime?: string;
      performanceOrder?: number;
    }>) =>
      request<Schedule>(`/schedules/${scheduleId}/lineups`, {
        method: 'PUT',
        body: JSON.stringify({ lineups }),
      }),
    removeLineup: (scheduleId: string, lineupId: string) =>
      request<void>(`/schedules/${scheduleId}/lineups/${lineupId}`, {
        method: 'DELETE',
      }),
  },
  scrape: {
    schedule: async (url: string): Promise<ScrapedSchedule> => {
      const res = await fetch(
        `/api/scrape-schedule?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Scrape failed: ${res.status}`);
      }
      return res.json();
    },
  },
  ocr: {
    lineup: async (imageUrls: string[]): Promise<{ lineup: ExtractedLineup[] }> => {
      const res = await fetch('/api/ocr-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `OCR failed: ${res.status}`);
      }
      return res.json();
    },
  },
  spotify: {
    getArtist: async (spotifyId: string) => {
      const res = await fetch(`/api/spotify?id=${spotifyId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Spotify fetch failed: ${res.status}`);
      }
      return res.json() as Promise<{
        name: string;
        imageUrl: string | null;
        description: string | null;
        spotifyId: string;
        spotifyUrl: string;
        monthlyListeners: number | null;
        spotifyMeta: SpotifyMeta | null;
      }>;
    },
  },
  youtube: {
    searchChannel: async (artistName: string) => {
      const res = await fetch(
        `/api/youtube?name=${encodeURIComponent(artistName)}`,
      );
      if (!res.ok) return null;
      return res.json() as Promise<{
        channelUrl: string | null;
        channelTitle: string | null;
      }>;
    },
  },
};
