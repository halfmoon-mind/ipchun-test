import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';

const NOL_API = 'https://api-ticketfront.interpark.com';

function buildHeaders(goodsId: string): Record<string, string> {
  return {
    Referer: `https://tickets.interpark.com/goods/${goodsId}`,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    Accept: 'application/json',
  };
}

/** "20260919" 또는 "202603112000" → ISO 문자열 */
function parseNolDate(s: string | null | undefined): string | null {
  if (!s || s.length < 8) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  const h = s.length >= 10 ? s.slice(8, 10) : '00';
  const min = s.length >= 12 ? s.slice(10, 12) : '00';
  return `${y}-${m}-${d}T${h}:${min}:00+09:00`;
}

const GENRE_MAP: Record<string, Genre> = {
  콘서트: Genre.CONCERT,
  뮤지컬: Genre.MUSICAL,
  연극: Genre.PLAY,
  클래식: Genre.CLASSIC,
  페스티벌: Genre.FESTIVAL,
};

export async function fetchFromNol(
  externalId: string,
): Promise<FetchedPerformance> {
  const headers = buildHeaders(externalId);

  // 1) Summary — 핵심 데이터
  const summaryRes = await fetch(
    `${NOL_API}/v1/goods/${externalId}/summary`,
    { headers },
  );
  if (!summaryRes.ok) {
    throw new Error(`NOL summary API 실패: ${summaryRes.status}`);
  }
  const summary = await summaryRes.json();

  // 2) Prices — 좌석등급별 가격
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  try {
    const pricesRes = await fetch(
      `${NOL_API}/v1/goods/${externalId}/prices/group`,
      { headers },
    );
    if (pricesRes.ok) {
      const pricesData = await pricesRes.json();
      for (const [gradeName, gradeInfo] of Object.entries(pricesData)) {
        const items = (gradeInfo as Record<string, unknown[]>)['기본가'];
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0] as { salesPrice?: number };
          if (first.salesPrice) {
            tickets.push({ seatGrade: gradeName, price: first.salesPrice });
          }
        }
      }
    }
  } catch {
    /* 가격 정보 실패 시 무시 */
  }

  // 3) Place — 공연장 상세
  let venue: FetchedPerformance['venue'] = null;
  if (summary.placeCode) {
    try {
      const placeRes = await fetch(
        `${NOL_API}/v1/Place/${summary.placeCode}`,
        { headers },
      );
      if (placeRes.ok) {
        const place = await placeRes.json();
        venue = {
          name: place.placeName || summary.placeName,
          address: place.placeAddress || null,
          latitude: place.latitude ? parseFloat(place.latitude) : null,
          longitude: place.longitude ? parseFloat(place.longitude) : null,
        };
      }
    } catch {
      /* Place API 실패 시 fallback */
    }
  }
  if (!venue && summary.placeName) {
    venue = {
      name: summary.placeName,
      address: null,
      latitude: null,
      longitude: null,
    };
  }

  // 4) 회차 스케줄
  const schedules: Array<{ dateTime: string }> = [];
  try {
    const seqRes = await fetch(
      `${NOL_API}/v1/goods/${externalId}/playSeq`,
      { headers },
    );
    if (seqRes.ok) {
      const seqData = await seqRes.json();
      if (Array.isArray(seqData)) {
        for (const seq of seqData) {
          const dt = seq.playDate || seq.playDateTime;
          if (dt) {
            const parsed = parseNolDate(String(dt).replace(/\D/g, ''));
            if (parsed) schedules.push({ dateTime: parsed });
          }
        }
      }
    }
  } catch {
    /* playSeq 실패 시 날짜 범위로 fallback */
  }

  // Fallback: startDate/endDate
  if (schedules.length === 0) {
    const start = parseNolDate(summary.playStartDate);
    if (start) {
      schedules.push({ dateTime: start });
      const end = parseNolDate(summary.playEndDate);
      if (end && end !== start) {
        schedules.push({ dateTime: end });
      }
    }
  }

  // 포스터 URL 정규화
  let posterUrl: string | null = summary.goodsLargeImageUrl || null;
  if (posterUrl && posterUrl.startsWith('//')) {
    posterUrl = `https:${posterUrl}`;
  }

  return {
    title: summary.goodsName || '',
    subtitle: null,
    genre: GENRE_MAP[summary.genreName] || Genre.OTHER,
    ageRating: summary.viewRateName || null,
    runtime: summary.runningTime || null,
    intermission: summary.interMissionTime || null,
    posterUrl,
    venue,
    organizer: summary.bizInfo || null,
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.NOL,
      externalId,
      sourceUrl: `https://tickets.interpark.com/goods/${externalId}`,
      ticketOpenAt: parseNolDate(summary.ticketOpenDate),
      bookingEndAt: parseNolDate(summary.bookingEndDate),
      salesStatus: summary.goodsStatus || null,
    },
  };
}
