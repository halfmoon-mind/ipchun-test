const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let _userId: string | null = null;

export function setUserId(id: string | null) {
  _userId = id;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders: Record<string, string> = _userId ? { 'x-user-id': _userId } : {};
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
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

export interface TicketItem {
  id: string;
  seatGrade: string;
  price: number;
}

export interface PerformanceSourceItem {
  id: string;
  platform: string;
  externalId: string;
  sourceUrl: string;
  ticketOpenAt: string | null;
  bookingEndAt: string | null;
  salesStatus: string | null;
  lastSyncedAt: string;
  tickets: TicketItem[];
}

export interface CalendarPerformance {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  genre: string;
  ageRating: string | null;
  runtime: number | null;
  intermission: number | null;
  posterUrl: string | null;
  status: string;
  organizer: string | null;
  venue: { name: string; address: string | null } | null;
  sources: PerformanceSourceItem[];
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

export interface UserProfile {
  userId: string;
  email: string;
  nickname: string | null;
  imageUrl: string | null;
  createdAt?: string;
}

export interface SignInParams {
  provider: 'APPLE' | 'GOOGLE';
  providerAccountId: string;
  email: string;
  nickname?: string;
  imageUrl?: string;
}

export interface ArtistSummaryWithFollow {
  id: string;
  name: string;
  imageUrl: string | null;
  spotifyUrl: string | null;
}

export const api = {
  users: {
    signIn(params: SignInParams): Promise<UserProfile & { isNew: boolean }> {
      return request('/users/sign-in', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    getMe(): Promise<UserProfile> {
      return request('/users/me');
    },
    updateMe(data: { nickname?: string; imageUrl?: string }): Promise<UserProfile> {
      return request('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    registerDeviceToken(playerId: string): Promise<{ ok: boolean }> {
      return request('/users/me/device-token', {
        method: 'PATCH',
        body: JSON.stringify({ playerId }),
      });
    },
    getFollows(): Promise<ArtistSummaryWithFollow[]> {
      return request('/users/me/follows');
    },
    followArtist(artistId: string): Promise<void> {
      return request(`/users/me/follows/${artistId}`, { method: 'POST' });
    },
    unfollowArtist(artistId: string): Promise<void> {
      return request(`/users/me/follows/${artistId}`, { method: 'DELETE' });
    },
  },
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
