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
  monthlyListeners: number | null;
  followers: number | null;
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

export const api = {
  artists: {
    getAll() {
      return request<ArtistSummary[]>('/artists');
    },
    getOne(id: string) {
      return request<Artist>(`/artists/${id}`);
    },
  },
  schedules: {
    getCalendar(year: number, month: number, artistId?: string) {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (artistId) params.set('artistId', artistId);
      return request<CalendarResponse>(`/schedules/calendar?${params}`);
    },
    getOne(id: string) {
      return request<ScheduleDetail>(`/schedules/${id}`);
    },
  },
};

// Response types
export interface CalendarSchedule {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  lineups: Array<{
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
      genre: string | null;
    };
  }>;
}

export interface CalendarResponse {
  year: number;
  month: number;
  schedules: CalendarSchedule[];
  dates: Record<string, string[]>;
}

export type ScheduleDetail = CalendarSchedule;
