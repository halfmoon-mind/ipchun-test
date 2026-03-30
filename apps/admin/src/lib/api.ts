import type { Artist, SpotifyMeta, Performance, FetchedPerformance, PaginatedResponse } from '@ipchun/shared';
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
    search: async (query: string) => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Spotify search failed: ${res.status}`);
      }
      return res.json() as Promise<{
        artists: { spotifyId: string; name: string; imageUrl: string | null; followers: number }[];
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
  performances: {
    list: (params?: { artistId?: string; period?: 'upcoming' | 'past'; cursor?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.artistId) query.set('artistId', params.artistId);
      if (params?.period) query.set('period', params.period);
      if (params?.cursor) query.set('cursor', params.cursor);
      if (params?.limit) query.set('limit', String(params.limit));
      const qs = query.toString();
      return request<Performance[] | PaginatedResponse<Performance>>(`/performances${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<Performance>(`/performances/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Performance>('/performances', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Performance>(`/performances/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/performances/${id}`, { method: 'DELETE' }),
    fetch: (url: string) =>
      request<FetchedPerformance>('/performances/fetch', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    calendar: (params: { year: number; month: number; artistId?: string }) => {
      const query = new URLSearchParams({
        year: String(params.year),
        month: String(params.month),
      });
      if (params.artistId) query.set('artistId', params.artistId);
      return request<{ year: number; month: number; performances: Performance[]; dates: Record<string, string[]> }>(
        `/performances/calendar?${query.toString()}`,
      );
    },
    replaceArtists: (id: string, artists: { artistId: string; role?: string; stageName?: string; startTime?: string; endTime?: string; performanceOrder?: number; stage?: string; performanceScheduleId?: string }[]) =>
      request<Performance>(`/performances/${id}/artists`, {
        method: 'PUT',
        body: JSON.stringify({ artists }),
      }),
    removeArtist: (id: string, artistEntryId: string) =>
      request<void>(`/performances/${id}/artists/${artistEntryId}`, {
        method: 'DELETE',
      }),
  },
};
