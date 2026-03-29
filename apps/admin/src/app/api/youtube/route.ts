import { NextRequest, NextResponse } from 'next/server';

interface YouTubeSearchItem {
  snippet: {
    channelId: string;
    channelTitle: string;
    title: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export async function GET(request: NextRequest) {
  const artistName = request.nextUrl.searchParams.get('name');
  if (!artistName) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: artistName,
      type: 'channel',
      maxResults: '1',
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error?.message || `YouTube API error: ${res.status}` },
        { status: 502 },
      );
    }

    const data: YouTubeSearchResponse = await res.json();
    const item = data.items?.[0];

    if (!item) {
      return NextResponse.json({ channelUrl: null, channelTitle: null });
    }

    return NextResponse.json({
      channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
      channelTitle: item.snippet.channelTitle,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
