import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

/** "2026.02.27" → "2026-02-27" */
function koreanDateToIso(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function fetchFromMelon(
  externalId: string,
): Promise<FetchedPerformance> {
  const sourceUrl = `https://ticket.melon.com/performance/index.htm?prodId=${externalId}`;

  const res = await fetch(sourceUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`멜론 티켓 페이지 요청 실패: ${res.status}`);
  const html = await res.text();

  // 제목: <p class="tit">...</p>
  let title = '';
  const titleMatch = html.match(
    /<(?:p class="tit"|h2 class="tit")\s*>([\s\S]*?)<\/(?:p|h2)>/,
  );
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // 부제: <p class="sub_tit">...</p>
  let subtitle: string | null = null;
  const subMatch = html.match(/<p class="sub_tit">([\s\S]*?)<\/p>/);
  if (subMatch) {
    subtitle = subMatch[1].replace(/<[^>]*>/g, '').trim() || null;
  }

  // 공연기간: "2026.02.27 - 2026.02.27" 또는 "2026.02.27 ~ 2026.02.27"
  let startDate: string | null = null;
  let endDate: string | null = null;
  const dateMatch = html.match(
    /(\d{4}\.\d{2}\.\d{2})\s*[-~]\s*(\d{4}\.\d{2}\.\d{2})/,
  );
  if (dateMatch) {
    startDate = koreanDateToIso(dateMatch[1]);
    endDate = koreanDateToIso(dateMatch[2]);
  }

  // 공연장: <a ... title="공연장명" ...>
  let venueName: string | null = null;
  const venueMatch = html.match(
    /<a[^>]*href="javascript[^"]*"[^>]*title="([^"]*)"[^>]*>/,
  );
  if (venueMatch) venueName = venueMatch[1].trim();

  // 주소
  let address: string | null = null;
  const addrMatch = html.match(
    /<p[^>]*>\s*((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^<]{5,80})\s*<\/p>/,
  );
  if (addrMatch) address = addrMatch[1].trim();

  // 포스터 이미지
  let posterUrl: string | null = null;
  const imgMatch = html.match(
    /<img[^>]*src="(https?:\/\/cdnticket\.melon\.co\.kr\/[^"]+)"/,
  );
  if (imgMatch) posterUrl = imgMatch[1];

  // 러닝타임: "120분" 패턴 (공연시간 컨텍스트 내에서)
  let runtime: number | null = null;
  const runtimeMatch = html.match(/공연\s*시간[^<]*?(\d+)\s*분/);
  if (runtimeMatch) runtime = parseInt(runtimeMatch[1]);

  // 관람등급
  let ageRating: string | null = null;
  const ageMatch = html.match(/(전체\s*관람가|만\s*\d+세\s*이상)/);
  if (ageMatch) ageRating = ageMatch[1].replace(/\s+/g, ' ');

  // 가격: "R석 110,000원" 패턴
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  const priceMatches = html.matchAll(
    /([가-힣A-Za-z]+석)\s*[:\s]*(\d[\d,]+)\s*원/g,
  );
  for (const pm of priceMatches) {
    const price = parseInt(pm[2].replace(/,/g, ''));
    if (price > 0) {
      tickets.push({ seatGrade: pm[1], price });
    }
  }
  // 단일 가격: "전석 110,000원"
  if (tickets.length === 0) {
    const singlePrice = html.match(/전석\s*(\d[\d,]+)\s*원/);
    if (singlePrice) {
      tickets.push({
        seatGrade: '전석',
        price: parseInt(singlePrice[1].replace(/,/g, '')),
      });
    }
  }

  // 주최/주관
  let organizer: string | null = null;
  const orgMatch = html.match(
    /(?:주최|기획)[^<]*?<[^>]*>\s*([^<]+)/,
  );
  if (orgMatch) organizer = orgMatch[1].trim();

  // 회차: 공연일시 텍스트에서 날짜+시간 파싱
  const schedules: Array<{ dateTime: string }> = [];
  // 멜론은 정확한 회차 정보를 텍스트로 제공 — 파싱이 어려우므로 startDate/endDate 활용
  if (startDate) {
    schedules.push({ dateTime: `${startDate}T00:00:00+09:00` });
    if (endDate && endDate !== startDate) {
      schedules.push({ dateTime: `${endDate}T00:00:00+09:00` });
    }
  }

  // 예매 오픈일
  let ticketOpenAt: string | null = null;
  const openMatch = html.match(
    /(?:예매|티켓)\s*(?:오픈|시작)[^<]*?(\d{4}\.\d{2}\.\d{2})[^<]*?(\d{1,2}:\d{2})?/,
  );
  if (openMatch) {
    const d = koreanDateToIso(openMatch[1]);
    const t = openMatch[2] || '00:00';
    if (d) ticketOpenAt = `${d}T${t}:00+09:00`;
  }

  return {
    title,
    subtitle,
    genre: Genre.CONCERT,
    ageRating,
    runtime,
    intermission: null,
    posterUrl,
    venue: venueName
      ? { name: venueName, address, latitude: null, longitude: null }
      : null,
    organizer,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.MELON,
      externalId,
      sourceUrl,
      ticketOpenAt,
      bookingEndAt: null,
      salesStatus: null,
    },
  };
}
