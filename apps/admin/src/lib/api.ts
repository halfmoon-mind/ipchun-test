import type { Artist, Schedule } from '@ipchun/shared';

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
    list: () => request<Artist[]>('/artists'),
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
  },
};
