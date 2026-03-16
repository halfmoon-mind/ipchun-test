import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

export function isTicketlinkUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?ticketlink\.co\.kr\/(product|global\/)/.test(url);
}

export async function parseTicketlink(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // OG 태그 추출
  let title = extractMetaContent(html, 'og:title');
  const imageUrl = extractMetaContent(html, 'og:image');

  // 페이지 내 모든 이미지 수집 (image.toast.com CDN)
  const images: string[] = [];
  if (imageUrl) images.push(imageUrl);
  const imgMatches = html.matchAll(/<img[^>]*src="(https?:\/\/image\.toast\.com\/[^"]+)"/g);
  for (const m of imgMatches) {
    if (!images.includes(m[1])) {
      images.push(m[1]);
    }
  }

  // JSON-LD에서 이벤트 정보 추출
  let description: string | null = null;
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
        if (jsonLd.performer) {
          const performerName = typeof jsonLd.performer === 'string'
            ? jsonLd.performer
            : jsonLd.performer.name || null;
          if (performerName) {
            description = `출연: ${performerName}`;
          }
        }
        break;
      }
    } catch {
      // JSON 파싱 실패 무시
    }
  }

  // OG title에서 " | 티켓링크" 접미사 제거
  if (title) {
    title = title.replace(/\s*\|\s*티켓링크$/, '');
  }

  return {
    title,
    description,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    images,
    sourceUrl: url,
    source: 'ticketlink',
  };
}
