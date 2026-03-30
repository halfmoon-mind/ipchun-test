const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface Artist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string> | null;
  spotifyId: string | null;
  spotifyUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistSummary {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  spotifyUrl: string | null;
}

export interface PerformanceArtist {
  id: string;
  artistId: string;
  stageName: string | null;
  startTime: string | null;
  endTime: string | null;
  performanceOrder: number | null;
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

export interface PerformanceSchedule {
  id: string;
  dateTime: string;
}

export interface CalendarPerformance {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  posterUrl: string | null;
  status: string;
  venue: { name: string; address: string | null } | null;
  schedules: PerformanceSchedule[];
  artists: PerformanceArtist[];
}

export interface CalendarResponse {
  year: number;
  month: number;
  performances: CalendarPerformance[];
  dates: Record<string, string[]>;
}

export interface PaginatedPerformanceResponse {
  data: CalendarPerformance[];
  nextCursor: string | null;
}

export const api = {
  artists: {
    getAll() {
      return request<ArtistSummary[]>('/artists');
    },
    getOne(id: string) {
      return request<Artist>(`/artists/${id}`);
    },
  },
  performances: {
    getCalendar(year: number, month: number, artistId?: string) {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (artistId) params.set('artistId', artistId);
      return request<CalendarResponse>(`/performances/calendar?${params}`);
    },
    getOne(id: string) {
      return request<CalendarPerformance>(`/performances/${id}`);
    },
    getByArtist(artistId: string, options: { period: 'upcoming' | 'past'; cursor?: string; limit?: number }) {
      const params = new URLSearchParams({ artistId, period: options.period });
      if (options.cursor) params.set('cursor', options.cursor);
      if (options.limit) params.set('limit', String(options.limit));
      return request<PaginatedPerformanceResponse>(`/performances?${params}`);
    },
  },
};
