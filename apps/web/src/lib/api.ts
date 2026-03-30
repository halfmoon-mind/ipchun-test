import type { Performance } from "@ipchun/shared";

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
};
