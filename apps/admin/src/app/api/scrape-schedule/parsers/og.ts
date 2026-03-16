import { ScrapedSchedule } from './types';

const BOT_USER_AGENT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** HTML에서 meta 태그 content 값을 추출하는 유틸 함수 */
export function extractMetaContent(html: string, property: string): string | null {
  // property="og:..." 또는 name="og:..." 둘 다 매칭
  const match = html.match(
    new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]*)"`, 'i'),
  );
  if (match) return match[1];
  // content가 먼저 오는 경우도 처리
  const match2 = html.match(
    new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:property|name)="${property}"`, 'i'),
  );
  return match2 ? match2[1] : null;
}

/** URL을 fetch하고 HTML을 반환하는 유틸 함수 */
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': BOT_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.text();
}

export async function parseOg(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  return {
    title: extractMetaContent(html, 'og:title'),
    description: extractMetaContent(html, 'og:description'),
    startDate: null,
    endDate: null,
    location: null,
    address: null,
    imageUrl: extractMetaContent(html, 'og:image'),
    sourceUrl: url,
    source: 'og',
  };
}
