import type { Artist, Performance, PaginatedResponse } from "@ipchun/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
