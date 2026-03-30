import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

export function isInterparkUrl(url: string): boolean {
  return /^https?:\/\/(tickets?\.|nol\.)?interpark\.com\/(goods|ticket)\//.test(url);
}

export async function parseInterpark(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // OG 태그 추출 (og.ts의 유틸 재사용)
  let title = extractMetaContent(html, 'og:title');
  const description = extractMetaContent(html, 'og:description');
  const imageUrl = extractMetaContent(html, 'og:image');

  // JSON-LD에서 이벤트 정보 추출 시도
  let startDate: string | null = null;
  let endDate: string | null = null;
  let location: string | null = null;
  let address: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(match[1]);
      if (jsonLd['@type'] === 'Event' || jsonLd['@type'] === 'MusicEvent') {
        title = title || jsonLd.name || null;
        startDate = jsonLd.startDate || null;
        endDate = jsonLd.endDate || null;
        if (jsonLd.location) {
          location = jsonLd.location.name || null;
          address = jsonLd.location.address?.streetAddress
            || jsonLd.location.address
            || null;
          if (typeof address === 'object') address = null;
        }
        break;
      }
    } catch {
      // JSON 파싱 실패 무시
    }
  }

  return {
    title,
    description,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    images: imageUrl ? [imageUrl] : [],
    sourceUrl: url,
    source: 'interpark',
  };
}
