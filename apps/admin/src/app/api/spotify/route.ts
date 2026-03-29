import { NextRequest, NextResponse } from 'next/server';

// --- Spotify Token Cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify API 키가 설정되지 않았습니다. SPOTIFY_CLIENT_ID와 SPOTIFY_CLIENT_SECRET을 확인해주세요.');
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
    throw new Error(`Spotify 인증 실패: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // 1분 여유
  return cachedToken!;
}

// --- Spotify API Helpers ---
async function spotifyApi<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(
      `Spotify API 요청 한도 초과. ${retryAfter ? `${retryAfter}초 후` : '잠시 후'} 다시 시도해주세요.`,
    );
  }

  if (!res.ok) return null;
  return res.json();
}

function parseMonthlyListeners(html: string): number | null {
  const match = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/,
  );
  if (!match) return null;

  const text = match[1]; // "Artist · 654.2K monthly listeners."
  const numMatch = text.match(/([\d,.]+)(K|M)?\s*monthly listeners/i);
  if (!numMatch) return null;

  let num = parseFloat(numMatch[1].replace(/,/g, ''));
  if (numMatch[2]?.toUpperCase() === 'K') num *= 1_000;
  if (numMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
  return Math.round(num);
}

// --- Spotify API Types ---
interface SpotifyArtist {
  name: string;
  id: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  name: string;
  popularity: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
}

// --- Route Handler ---
export async function GET(request: NextRequest) {
  const spotifyId = request.nextUrl.searchParams.get('id');
  if (!spotifyId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();

    // 4개 요청 병렬 실행
    const [artist, topTracksRes, relatedRes, htmlRes] = await Promise.all([
      spotifyApi<SpotifyArtist>(token, `/artists/${spotifyId}`),
      spotifyApi<{ tracks: SpotifyTrack[] }>(token, `/artists/${spotifyId}/top-tracks?market=KR`),
      spotifyApi<{ artists: SpotifyArtist[] }>(token, `/artists/${spotifyId}/related-artists`),
      fetch(`https://open.spotify.com/artist/${spotifyId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      }).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
    ]);

    if (!artist) {
      return NextResponse.json(
        { error: 'Spotify에서 아티스트를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    // og:description에서 월간 리스너 파싱
    const monthlyListeners = parseMonthlyListeners(htmlRes);

    // JSON-LD에서 description 추출
    let description: string | null = null;
    const jsonLdMatch = htmlRes.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        description = jsonLd.description || null;
      } catch {}
    }

    const data = {
      name: artist.name,
      imageUrl: artist.images[0]?.url || null,
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
        topTracks: (topTracksRes?.tracks || []).map((t) => ({
          name: t.name,
          previewUrl: t.preview_url,
          popularity: t.popularity,
          albumName: t.album.name,
          albumImageUrl: t.album.images[0]?.url || null,
        })),
        relatedArtists: (relatedRes?.artists || []).map((a) => ({
          name: a.name,
          spotifyId: a.id,
          imageUrl: a.images[0]?.url || null,
          genres: a.genres,
        })),
      },
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
