import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, PerformanceStatus, TicketPlatform } from '@ipchun/shared';
import { extractArtistNames } from './extract-artist-names';

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

/** playTime 텍스트에서 회차별 날짜/시간 파싱
 *  - 한국어: "2026년 4월 3일(금) 오후 8시 30분"
 *  - 영문:   "2026년 4월 3일(금) 8PM(KST)" 또는 "8:30PM(KST)"
 */
function parsePlayTimeSchedules(
  playTime: string | null | undefined,
): Array<{ dateTime: string }> {
  if (!playTime) return [];
  const results: Array<{ dateTime: string }> = [];

  // 한국어 오전/오후 패턴
  const reKo =
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^)]*\)\s*(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g;
  let match: RegExpExecArray | null;
  while ((match = reKo.exec(playTime)) !== null) {
    const [, y, mo, d, ampm, hRaw, minRaw] = match;
    let h = parseInt(hRaw, 10);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${(minRaw || '00').padStart(2, '0')}:00+09:00`;
    results.push({ dateTime: iso });
  }

  // 영문 AM/PM 패턴 (예: "8PM", "8:30PM", "8PM(KST)")
  if (results.length === 0) {
    const reEn =
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^)]*\)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
    while ((match = reEn.exec(playTime)) !== null) {
      const [, y, mo, d, hRaw, minRaw, ampm] = match;
      let h = parseInt(hRaw, 10);
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${(minRaw || '00').padStart(2, '0')}:00+09:00`;
      results.push({ dateTime: iso });
    }
  }

  // 24시간 형식 (예: "19:30", "20:00")
  if (results.length === 0) {
    const re24 =
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^)]*\)\s*(\d{1,2}):(\d{2})/g;
    while ((match = re24.exec(playTime)) !== null) {
      const [, y, mo, d, hRaw, minRaw] = match;
      const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${hRaw.padStart(2, '0')}:${minRaw}:00+09:00`;
      results.push({ dateTime: iso });
    }
  }

  // 날짜와 시간이 별도 줄에 있는 경우 (예: "2026년 04월 25일(토)\n11시 30분")
  if (results.length === 0) {
    const dateOnly =
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
    const dates: Array<{ y: string; mo: string; d: string }> = [];
    while ((match = dateOnly.exec(playTime)) !== null) {
      dates.push({ y: match[1], mo: match[2], d: match[3] });
    }

    if (dates.length > 0) {
      let h = 0;
      let min = 0;
      // 오전/오후 N시 (M분)
      const timeKo = playTime.match(
        /(?:^|[\s\r\n])(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?(?:\s|$)/m,
      );
      // HH:MM
      const time24 = playTime.match(/(?:^|[\s\r\n])(\d{1,2}):(\d{2})(?:\s|$)/m);

      if (timeKo) {
        h = parseInt(timeKo[2], 10);
        min = timeKo[3] ? parseInt(timeKo[3], 10) : 0;
        if (timeKo[1] === '오후' && h < 12) h += 12;
        if (timeKo[1] === '오전' && h === 12) h = 0;
      } else if (time24) {
        h = parseInt(time24[1], 10);
        min = parseInt(time24[2], 10);
      }

      for (const dt of dates) {
        const iso = `${dt.y}-${dt.mo.padStart(2, '0')}-${dt.d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+09:00`;
        results.push({ dateTime: iso });
      }
    }
  }

  return results;
}

const GENRE_MAP: Record<string, Genre> = {
  콘서트: Genre.CONCERT,
  뮤지컬: Genre.MUSICAL,
  연극: Genre.PLAY,
  클래식: Genre.CLASSIC,
  페스티벌: Genre.FESTIVAL,
};

/** NOL goodsStatus + 날짜 기반으로 PerformanceStatus 매핑 */
function mapNolStatus(summary: {
  goodsStatus?: string;
  soldOut?: boolean | null;
  ticketOpenDate?: string;
  bookingEndDate?: string;
  playEndDate?: string;
}): string {
  // 매진
  if (summary.soldOut) return PerformanceStatus.SOLD_OUT;

  const now = Date.now();
  const playEnd = parseNolDate(summary.playEndDate);
  const ticketOpen = parseNolDate(summary.ticketOpenDate);

  // 공연 종료
  if (playEnd && new Date(playEnd).getTime() < now) {
    return PerformanceStatus.COMPLETED;
  }

  // goodsStatus !== 'Y' → 취소 또는 판매 종료
  if (summary.goodsStatus && summary.goodsStatus !== 'Y') {
    return PerformanceStatus.CANCELLED;
  }

  // 티켓 오픈 전
  if (ticketOpen && new Date(ticketOpen).getTime() > now) {
    return PerformanceStatus.SCHEDULED;
  }

  return PerformanceStatus.ON_SALE;
}

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
  const summaryRaw: any = await summaryRes.json();
  const summary: any = summaryRaw.data ?? summaryRaw;

  // 2) Prices — 좌석등급별 가격
  const tickets: Array<{ seatGrade: string; price: number }> = [];
  try {
    const pricesRes = await fetch(
      `${NOL_API}/v1/goods/${externalId}/prices/group`,
      { headers },
    );
    if (pricesRes.ok) {
      const pricesRaw: any = await pricesRes.json();
      const pricesData: any = pricesRaw.data ?? pricesRaw;
      for (const [gradeName, gradeInfo] of Object.entries(pricesData)) {
        if (gradeName === 'common') continue;
        const priceTypes = gradeInfo as Record<string, unknown[]>;
        // '기본가' 우선, 없으면 첫 번째 가격 유형 사용
        const items =
          priceTypes['기본가'] ?? Object.values(priceTypes)[0];
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
        const placeRaw: any = await placeRes.json();
        const place: any = placeRaw.data ?? placeRaw;
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
      const seqRaw: any = await seqRes.json();
      const seqData: any = seqRaw.data ?? seqRaw;
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

  // Fallback 1: playTime 텍스트에서 회차별 시간 파싱
  if (schedules.length === 0) {
    schedules.push(...parsePlayTimeSchedules(summary.playTime));
  }

  // Fallback 2: startDate/endDate (시간 없는 날짜만)
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

  // 5) 아티스트 이름 추출
  const performers: string[] = [];
  if (summary.bizInfo) {
    const orgMatch = (summary.bizInfo as string).match(/주최\s*:\s*([^/\r\n]+)/);
    if (orgMatch) {
      const name = orgMatch[1].trim();
      if (name && !/\(주\)|\(재\)|재단|협회|기획|엔터|컴퍼니|프로덕션|스튜디오|entertainment|company/i.test(name)) {
        performers.push(name);
      }
    }
  }
  if (summary.castingInfo) {
    const castNames = (summary.castingInfo as string)
      .split(/[,、/]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    performers.push(...castNames);
  }

  // castingInfo가 비어있으면 캐스팅 API에서 출연진 조회 (페스티벌 등)
  if (performers.length === 0) {
    try {
      const castRes = await fetch(
        `${NOL_API}/v1/goods/casting?goodsCode=${externalId}&castingRole=ALL`,
        { headers },
      );
      if (castRes.ok) {
        const castRaw: any = await castRes.json();
        const castData: any[] = castRaw.data ?? [];
        for (const entry of castData) {
          if (entry.manName) {
            performers.push(entry.manName);
          }
        }
      }
    } catch {
      /* 캐스팅 API 실패 시 무시 */
    }
  }

  const artistNames = extractArtistNames(summary.goodsName || '', { performers });

  return {
    title: summary.goodsName || '',
    subtitle: null,
    genre: GENRE_MAP[summary.genreName] || Genre.OTHER,
    ageRating: summary.viewRateName || null,
    runtime: summary.runningTime && parseInt(summary.runningTime, 10) > 0
      ? parseInt(summary.runningTime, 10)
      : null,
    intermission: summary.interMissionTime
      ? parseInt(summary.interMissionTime, 10) || null
      : null,
    posterUrl,
    venue,
    organizer: (() => {
      if (!summary.bizInfo) return null;
      const m = (summary.bizInfo as string).match(/주최\s*:\s*([^/\r\n]+)/);
      return m ? m[1].trim() : (summary.bizInfo as string).split(/[\r\n]/)[0].trim() || null;
    })(),
    schedules,
    tickets,
    source: {
      platform: TicketPlatform.NOL,
      externalId,
      sourceUrl: `https://tickets.interpark.com/goods/${externalId}`,
      ticketOpenAt: parseNolDate(summary.ticketOpenDate),
      bookingEndAt: parseNolDate(summary.bookingEndDate),
      salesStatus: mapNolStatus(summary),
    },
    artistNames,
  };
}
