import { Injectable, Logger } from '@nestjs/common';
import {
  SpotifyApiArtist,
  SpotifyApiTrack,
  SpotifySearchResult,
  SpotifyArtistDetail,
} from './spotify.types';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getToken(): Promise<string | null> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured');
      return null;
    }

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      this.logger.error(`Spotify auth failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  private async spotifyApi<T>(token: string, path: string): Promise<T | null> {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  }

  async search(query: string): Promise<SpotifySearchResult[]> {
    const token = await this.getToken();
    if (!token) return [];

    try {
      const res = await fetch(
        `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return [];

      const data = (await res.json()) as { artists?: { items?: SpotifyApiArtist[] } };
      return (data.artists?.items ?? []).map((a: SpotifyApiArtist) => ({
        spotifyId: a.id,
        name: a.name,
        imageUrl: a.images[0]?.url ?? null,
        followers: a.followers?.total ?? 0,
      }));
    } catch (err) {
      this.logger.error(`Spotify search failed: ${err}`);
      return [];
    }
  }

  async getArtist(spotifyId: string): Promise<SpotifyArtistDetail | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const [artist, topTracksRes, relatedRes, html] = await Promise.all([
        this.spotifyApi<SpotifyApiArtist>(token, `/artists/${spotifyId}`),
        this.spotifyApi<{ tracks: SpotifyApiTrack[] }>(
          token,
          `/artists/${spotifyId}/top-tracks?market=KR`,
        ),
        this.spotifyApi<{ artists: SpotifyApiArtist[] }>(
          token,
          `/artists/${spotifyId}/related-artists`,
        ),
        fetch(`https://open.spotify.com/artist/${spotifyId}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          },
        })
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => ''),
      ]);

      if (!artist) return null;

      const monthlyListeners = this.parseMonthlyListeners(html);
      const description = this.parseDescription(html);

      return {
        name: artist.name,
        imageUrl: artist.images[0]?.url ?? null,
        description,
        spotifyId,
        spotifyUrl: `https://open.spotify.com/artist/${spotifyId}`,
        monthlyListeners,
        spotifyMeta: {
          genres: artist.genres ?? [],
          popularity: artist.popularity ?? 0,
          followers: artist.followers?.total ?? 0,
          images: (artist.images ?? []).map((img) => ({
            url: img.url,
            width: img.width,
            height: img.height,
          })),
          topTracks: (topTracksRes?.tracks ?? []).slice(0, 5).map((t) => ({
            name: t.name,
            previewUrl: t.preview_url,
            popularity: t.popularity,
            albumName: t.album.name,
            albumImageUrl: t.album.images[0]?.url ?? null,
          })),
          relatedArtists: (relatedRes?.artists ?? []).slice(0, 5).map((a) => ({
            name: a.name,
            spotifyId: a.id,
            imageUrl: a.images[0]?.url ?? null,
            genres: a.genres,
          })),
        },
      };
    } catch (err) {
      this.logger.error(`Spotify getArtist failed: ${err}`);
      return null;
    }
  }

  private parseMonthlyListeners(html: string): number | null {
    const match = html.match(
      /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/,
    );
    if (!match) return null;

    const numMatch = match[1].match(/([\d,.]+)(K|M)?\s*monthly listeners/i);
    if (!numMatch) return null;

    let num = parseFloat(numMatch[1].replace(/,/g, ''));
    if (numMatch[2]?.toUpperCase() === 'K') num *= 1_000;
    if (numMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
    return Math.round(num);
  }

  private parseDescription(html: string): string | null {
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (!jsonLdMatch) return null;

    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const raw: string | undefined = jsonLd.description;
      if (!raw) return null;

      const lower = raw.toLowerCase();
      if (
        /monthly listeners?/i.test(lower) ||
        /where people listen/i.test(lower) ||
        /^artist\s*·/i.test(raw.trim()) ||
        /·\s*song:/i.test(raw)
      ) {
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  }
}
