import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

/** "2026.02.27" → "2026-02-27" */
function koreanDateToIso(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** "2026년 3월 6일" → "2026-03-06" */
function koreanFullDateToIso(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const GENRE_MAP: Record<string, Genre> = {
  콘서트: Genre.CONCERT,
  뮤지컬: Genre.MUSICAL,
  연극: Genre.PLAY,
  클래식: Genre.CLASSIC,
  페스티벌: Genre.FESTIVAL,
};


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
    /<p class="tit"[^>]*>([\s\S]*?)<\/p>/,
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

  // 공연장: <a id="performanceHallBtn" ... title="공연장명">
  let venueName: string | null = null;
  const venueMatch = html.match(
    /<a[^>]*id="performanceHallBtn"[^>]*title="([^"]*)"[^>]*>/,
  );
  if (venueMatch) {
    venueName = venueMatch[1].replace(/&nbsp;/g, '').trim();
  }

  // 주소
  let address: string | null = null;
  const addrMatch = html.match(
    /<p[^>]*>\s*((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^<]{5,80})\s*<\/p>/,
  );
  if (addrMatch) address = addrMatch[1].trim();

  // 포스터 이미지: og:image 메타 태그 (가장 신뢰성 높음), 없으면 /product/ CDN URL
  let posterUrl: string | null = null;
  const ogImage = html.match(
    /<meta\s+property="og:image"\s+content="([^"]+)"/,
  );
  if (ogImage) {
    posterUrl = ogImage[1];
  } else {
    const imgMatch = html.match(
      /<img[^>]*src="(https?:\/\/cdnticket\.melon\.co\.kr\/resource\/image\/upload\/product\/[^"]+)"/,
    );
    if (imgMatch) posterUrl = imgMatch[1];
  }

  // 러닝타임: <dt class="tit_info">관람시간</dt> <dd class="txt_info">100분</dd>
  let runtime: number | null = null;
  const rtDdMatch = html.match(
    /<dt[^>]*>관람시간<\/dt>\s*<dd[^>]*>(\d+)\s*분<\/dd>/,
  );
  if (rtDdMatch) {
    runtime = parseInt(rtDdMatch[1]);
  }

  // 장르: <dt class="tit_info">장르</dt> <dd class="txt_info">콘서트</dd>
  let genre: Genre = Genre.CONCERT;
  const genreDdMatch = html.match(
    /<dt[^>]*>장르<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/,
  );
  if (genreDdMatch) {
    genre = GENRE_MAP[genreDdMatch[1].trim()] ?? Genre.OTHER;
  }

  // 관람등급: dt/dd 구조 우선, 폴백으로 텍스트 매칭
  let ageRating: string | null = null;
  const ageDdMatch = html.match(
    /<dt[^>]*>관람등급<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/,
  );
  if (ageDdMatch) {
    ageRating = ageDdMatch[1].trim();
  } else {
    const ageMatch = html.match(/(전체\s*관람가|만\s*\d+세\s*이상)/);
    if (ageMatch) ageRating = ageMatch[1].replace(/\s+/g, ' ');
  }

  // 가격: <span class="seat_name">전석</span> <span class="price">66,000원</span>
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  const seatPairs = html.matchAll(
    /<span class="seat_name">([^<]+)<\/span>\s*<span class="price">(\d[\d,]+)원<\/span>/g,
  );
  for (const sp of seatPairs) {
    const price = parseInt(sp[2].replace(/,/g, ''));
    if (price > 0) {
      tickets.push({ seatGrade: sp[1].trim(), price });
    }
  }
  // 폴백: 인라인 텍스트 "전석 66,000원"
  if (tickets.length === 0) {
    const inlinePrice = html.matchAll(
      /([가-힣A-Za-z]+석)\s*[:\s]*(\d[\d,]+)\s*원/g,
    );
    for (const pm of inlinePrice) {
      const price = parseInt(pm[2].replace(/,/g, ''));
      if (price > 0) {
        tickets.push({ seatGrade: pm[1], price });
      }
    }
  }

  // 주최/주관: <th>주최 / 기획</th><td>...</td>
  let organizer: string | null = null;
  const orgMatch = html.match(
    /<th[^>]*>\s*주최\s*(?:\/\s*기획)?\s*<\/th>\s*<td>([^<]+)<\/td>/,
  );
  if (orgMatch) {
    organizer = orgMatch[1].trim();
  }

  // 회차: box_concert_time 섹션에서 날짜+시간 파싱
  const schedules: Array<{ dateTime: string }> = [];
  const concertTimeMatch = html.match(
    /<div class="box_concert_time">([\s\S]*?)<\/div>/,
  );
  if (concertTimeMatch) {
    const timeText = concertTimeMatch[1].replace(/<[^>]*>/g, '');
    const timeEntries = timeText.matchAll(
      /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일[^)]*\)\s*(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/g,
    );
    for (const m of timeEntries) {
      const d = koreanFullDateToIso(m[1], m[2], m[3]);
      let hour = parseInt(m[5]);
      if (m[4] === '오후' && hour < 12) hour += 12;
      if (m[4] === '오전' && hour === 12) hour = 0;
      const min = m[6] ? m[6].padStart(2, '0') : '00';
      schedules.push({
        dateTime: `${d}T${String(hour).padStart(2, '0')}:${min}:00+09:00`,
      });
    }
  }
  // 폴백: box_concert_time 파싱 실패 시 공연기간 날짜 사용
  if (schedules.length === 0 && startDate) {
    schedules.push({ dateTime: `${startDate}T00:00:00+09:00` });
    if (endDate && endDate !== startDate) {
      schedules.push({ dateTime: `${endDate}T00:00:00+09:00` });
    }
  }

  // 예매 오픈일: "2026.02.27" 형식 또는 "2026년 3월 6일" 한국어 형식
  let ticketOpenAt: string | null = null;
  const openDotMatch = html.match(
    /(?:예매|티켓)\s*(?:오픈|시작)[^<]*?(\d{4}\.\d{2}\.\d{2})[^<]*?(\d{1,2}:\d{2})?/,
  );
  if (openDotMatch) {
    const d = koreanDateToIso(openDotMatch[1]);
    const t = openDotMatch[2] || '00:00';
    if (d) ticketOpenAt = `${d}T${t}:00+09:00`;
  } else {
    // "오픈 : 2026년 3월 6일(금) 오후 8시" 패턴
    const openKrMatch = html.match(
      /오픈\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^<]*?(?:(오전|오후)\s*(\d{1,2})시)/,
    ) || html.match(
      /오픈\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    );
    if (openKrMatch) {
      const d = koreanFullDateToIso(openKrMatch[1], openKrMatch[2], openKrMatch[3]);
      let hour = openKrMatch[5] ? parseInt(openKrMatch[5]) : 0;
      if (openKrMatch[4] === '오후' && hour < 12) hour += 12;
      if (openKrMatch[4] === '오전' && hour === 12) hour = 0;
      ticketOpenAt = `${d}T${String(hour).padStart(2, '0')}:00:00+09:00`;
    }
  }

  // 판매 상태: 멜론은 상태를 클라이언트 JS로 렌더링하므로 날짜 기반 유추
  // SCHEDULED(예정) → ON_SALE(판매중) → COMPLETED(종료)
  // SOLD_OUT/CANCELLED는 서버 사이드에서 판단 불가
  let salesStatus: string | null = null;
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKst = nowKst.toISOString().slice(0, 10);
  const ticketOpenDate = ticketOpenAt?.slice(0, 10) ?? null;

  if (endDate && endDate < todayKst) {
    salesStatus = 'COMPLETED';
  } else if (ticketOpenDate && ticketOpenDate <= todayKst) {
    salesStatus = 'ON_SALE';
  } else {
    salesStatus = 'SCHEDULED';
  }

  return {
    title,
    subtitle,
    genre,
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
      salesStatus,
    },
  };
}
