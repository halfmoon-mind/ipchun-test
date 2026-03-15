import { NextRequest, NextResponse } from 'next/server';

interface SpotifyScrapedData {
  name: string;
  imageUrl: string | null;
  description: string | null;
  spotifyId: string;
  spotifyUrl: string;
}

export async function GET(request: NextRequest) {
  const spotifyId = request.nextUrl.searchParams.get('id');
  if (!spotifyId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const url = `https://open.spotify.com/artist/${spotifyId}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Spotify page: ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();

    // 1. JSON-LD에서 이름, 설명 추출
    let name = '';
    let description: string | null = null;
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        name = jsonLd.name || '';
        description = jsonLd.description || null;
      } catch {}
    }

    // 2. og:image에서 이미지 추출
    let imageUrl: string | null = null;
    const ogImageMatch = html.match(
      /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/,
    );
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1];
    }

    const data: SpotifyScrapedData = {
      name,
      imageUrl,
      description,
      spotifyId,
      spotifyUrl: url,
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
