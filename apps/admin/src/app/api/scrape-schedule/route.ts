import { NextRequest, NextResponse } from 'next/server';
import { isInstagramUrl, parseInstagram } from './parsers/instagram';
import { isInterparkUrl, parseInterpark } from './parsers/interpark';
import { isTicketlinkUrl, parseTicketlink } from './parsers/ticketlink';
import { isMelonTicketUrl, parseMelonTicket } from './parsers/melon';
import { isYes24Url, parseYes24 } from './parsers/yes24';
import { parseOg } from './parsers/og';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // URL 유효성 간단 검증
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    let result;

    if (isInstagramUrl(url)) {
      result = await parseInstagram(url);
    } else if (isInterparkUrl(url)) {
      result = await parseInterpark(url);
    } else if (isTicketlinkUrl(url)) {
      result = await parseTicketlink(url);
    } else if (isMelonTicketUrl(url)) {
      result = await parseMelonTicket(url);
    } else if (isYes24Url(url)) {
      result = await parseYes24(url);
    } else {
      // 범용 OG 폴백
      result = await parseOg(url);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to scrape URL' },
      { status: 502 },
    );
  }
}
