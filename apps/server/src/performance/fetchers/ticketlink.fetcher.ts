import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

const MAPI = 'https://mapi.ticketlink.co.kr/mapi';

export async function fetchFromTicketlink(
  externalId: string,
): Promise<FetchedPerformance> {
  const pageUrl = `https://www.ticketlink.co.kr/product/${externalId}`;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };

  // ── Layer 1: JSON-LD 파싱 ──
  const htmlRes = await fetch(pageUrl, {
    headers: { ...headers, Accept: 'text/html' },
  });
  if (!htmlRes.ok) {
    throw new Error(`티켓링크 페이지 요청 실패: ${htmlRes.status}`);
  }
  const html = await htmlRes.text();

  let title = '';
  let startDate: string | null = null;
  let endDate: string | null = null;
  let venueName: string | null = null;
  let venueAddress: string | null = null;
  let posterUrl: string | null = null;
  let organizer: string | null = null;
  let representativePrice: number | null = null;
  let salesStatus: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld['@type'] !== 'Event' && ld['@type'] !== 'MusicEvent') continue;

      title = ld.name || '';
      startDate = ld.startDate || null;
      endDate = ld.endDate || null;
      posterUrl = Array.isArray(ld.image) ? ld.image[0] : ld.image || null;

      if (ld.location) {
        venueName = ld.location.name || null;
        venueAddress =
          typeof ld.location.address === 'string'
            ? ld.location.address
            : ld.location.address?.streetAddress || null;
      }
      if (ld.organizer) {
        organizer =
          typeof ld.organizer === 'string'
            ? ld.organizer
            : ld.organizer.name || null;
      }
      if (ld.offers?.price) {
        representativePrice = parseInt(ld.offers.price);
      }
      if (ld.offers?.availability) {
        salesStatus = ld.offers.availability.includes('InStock')
          ? 'ON_SALE'
          : 'SOLD_OUT';
      }
      break;
    } catch {
      /* JSON-LD 파싱 실패 무시 */
    }
  }

  // "|티켓링크" 접미사 제거
  title = title.replace(/\s*\|\s*티켓링크$/, '');

  // ── Layer 2: MAPI — 회차 날짜+시각 ──
  const schedules: Array<{ dateTime: string }> = [];
  try {
    const datesRes = await fetch(
      `${MAPI}/product/${externalId}/datesByUtc`,
      { headers: { ...headers, Accept: 'application/json' } },
    );
    if (datesRes.ok) {
      const datesData: any = await datesRes.json();
      if (datesData.data && Array.isArray(datesData.data)) {
        for (const item of datesData.data) {
          if (item.productDate) {
            const dt = new Date(item.productDate);
            schedules.push({ dateTime: dt.toISOString() });
          }
        }
      }
    }
  } catch {
    /* MAPI 실패 시 JSON-LD 날짜로 fallback */
  }

  // Fallback: JSON-LD 날짜
  if (schedules.length === 0 && startDate) {
    schedules.push({ dateTime: new Date(startDate).toISOString() });
    if (endDate && endDate !== startDate) {
      schedules.push({ dateTime: new Date(endDate).toISOString() });
    }
  }

  // 티켓 가격
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  if (representativePrice && representativePrice > 0) {
    tickets.push({ seatGrade: '일반', price: representativePrice });
  }

  return {
    title,
    subtitle: null,
    genre: Genre.CONCERT,
    ageRating: null,
    runtime: null,
    intermission: null,
    posterUrl,
    venue: venueName
      ? {
          name: venueName,
          address: venueAddress,
          latitude: null,
          longitude: null,
        }
      : null,
    organizer,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.TICKETLINK,
      externalId,
      sourceUrl: pageUrl,
      ticketOpenAt: null,
      bookingEndAt: null,
      salesStatus,
    },
  };
}
