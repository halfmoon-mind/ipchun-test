import type { Artist, Performance, PaginatedResponse } from "@ipchun/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/* ── In-memory cache (client-side only) ── */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; ts: number }>();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = path;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data as T;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  const data: T = await res.json();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

export interface CalendarResponse {
  year: number;
  month: number;
  performances: Performance[];
  dates: Record<string, string[]>;
}

export const api = {
  calendar: (year: number, month: number) =>
    request<CalendarResponse>(`/performances/calendar?year=${year}&month=${month}`),

  performance: (id: string) =>
    request<Performance>(`/performances/${id}`),

  artist: (id: string) =>
    request<Artist>(`/artists/${id}`),

  artists: (search?: string) => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    const qs = sp.toString();
    return request<Artist[]>(`/artists${qs ? `?${qs}` : ""}`);
  },

  performances: (params: {
    artistId: string;
    period?: "upcoming" | "past";
    cursor?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    sp.set("artistId", params.artistId);
    if (params.period) sp.set("period", params.period);
    if (params.cursor) sp.set("cursor", params.cursor);
    if (params.limit) sp.set("limit", String(params.limit));
    return request<PaginatedResponse<Performance>>(
      `/performances?${sp}`,
    );
  },
};
