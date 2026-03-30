import { ScrapedSchedule } from './types';
import { fetchHtml } from './og';

export function isMelonTicketUrl(url: string): boolean {
  return /^https?:\/\/ticket\.melon\.com\/performance\//.test(url);
}

/** 한국식 날짜 문자열 "2026.02.27"을 ISO 8601로 변환 */
function koreanDateToIso(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function parseMelonTicket(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // 제목 추출: <p class="tit">...</p> 또는 <span class="txt">...</span>
  let title: string | null = null;
  const titleMatch = html.match(/<(?:p class="tit"|span class="txt")>([\s\S]*?)<\/(?:p|span)>/);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // 공연기간 추출: "2026.02.27 - 2026.02.27" 패턴
  let startDate: string | null = null;
  let endDate: string | null = null;
  const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})\s*[-~]\s*(\d{4}\.\d{2}\.\d{2})/);
  if (dateMatch) {
    startDate = koreanDateToIso(dateMatch[1]);
    endDate = koreanDateToIso(dateMatch[2]);
  }

  // 공연장 이름 추출
  let location: string | null = null;
  const venueMatch = html.match(/<a[^>]*href="javascript[^"]*"[^>]*title="([^"]*)"[^>]*>/);
  if (venueMatch) {
    location = venueMatch[1].trim();
  }

  // 주소 추출
  let address: string | null = null;
  const addressMatch = html.match(/<p[^>]*>\s*((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^<]{5,80})\s*<\/p>/);
  if (addressMatch) {
    address = addressMatch[1].trim();
  }

  // 모든 이미지 수집: cdnticket.melon.co.kr 상품 이미지 + cdnimg.melon.co.kr 아티스트 이미지
  const images: string[] = [];
  const imgMatches = html.matchAll(
    /<img[^>]*src="(https?:\/\/cdn(?:ticket|img)\.melon\.co\.kr\/[^"]+)"/g,
  );
  for (const m of imgMatches) {
    if (!images.includes(m[1])) {
      images.push(m[1]);
    }
  }

  // 대표 이미지: 첫 번째 상품 이미지
  const imageUrl = images[0] || null;

  return {
    title,
    description: null,
    startDate,
    endDate,
    location,
    address,
    imageUrl,
    images,
    sourceUrl: url,
    source: 'melon',
  };
}
