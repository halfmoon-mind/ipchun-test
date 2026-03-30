import { NextRequest, NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify API 키가 설정되지 않았습니다.');
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
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

interface SpotifySearchArtist {
  id: string;
  name: string;
  images: { url: string }[];
  followers: { total: number };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(q)}&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Spotify API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const artists = (data.artists?.items ?? []).map((a: SpotifySearchArtist) => ({
      spotifyId: a.id,
      name: a.name,
      imageUrl: a.images[0]?.url ?? null,
      followers: a.followers?.total ?? 0,
    }));

    return NextResponse.json({ artists });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
