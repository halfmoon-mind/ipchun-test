import type { FetchedPerformance } from '@ipchun/shared';
import { Genre, TicketPlatform } from '@ipchun/shared';
import { extractArtistNames } from './extract-artist-names';

const GENRE_MAP: Record<string, Genre> = {
  콘서트: Genre.CONCERT,
  뮤지컬: Genre.MUSICAL,
  연극: Genre.PLAY,
  클래식: Genre.CLASSIC,
  페스티벌: Genre.FESTIVAL,
  트로트: Genre.TROT,
};

export async function fetchFromYes24(
  externalId: string,
): Promise<FetchedPerformance> {
  const sourceUrl = `https://ticket.yes24.com/Perf/${externalId}`;

  const res = await fetch(sourceUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`YES24 페이지 요청 실패: ${res.status}`);
  const html = await res.text();

  // ── JSON-LD 파싱 ──
  let ldTitle = '';
  let ldStartDate: string | null = null;
  let ldEndDate: string | null = null;
  let ldVenueName: string | null = null;
  let ldAddress: string | null = null;
  let ldImageUrl: string | null = null;
  let ldPerformer: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld['@type'] !== 'Event') continue;

      ldTitle = ld.name || '';
      ldStartDate = ld.startDate || null;
      ldEndDate = ld.endDate || null;
      ldImageUrl = ld.image || null;

      if (ld.location) {
        ldVenueName = ld.location.name || null;
        ldAddress =
          typeof ld.location.address === 'string'
            ? ld.location.address
            : ld.location.address?.streetAddress || null;
      }

      if (ld.performer) {
        ldPerformer =
          typeof ld.performer === 'string'
            ? ld.performer
            : ld.performer.name || null;
      }
      break;
    } catch {
      /* JSON-LD 파싱 실패 무시 */
    }
  }

  // 삭제/만료된 공연 감지
  if (!ldTitle) {
    // JSON-LD 없으면 HTML에서 제목 시도
    const bigTitle = html.match(/<p class="rn-big-title">([^<]+)<\/p>/);
    if (bigTitle) {
      ldTitle = bigTitle[1].trim();
    }
  }
  if (!ldTitle) {
    throw new Error(
      `YES24 페이지 요청 실패: 유효한 공연 데이터 없음 — ${sourceUrl}`,
    );
  }

  // ── 포스터 이미지 ──
  let posterUrl: string | null = null;
  const posterMatch = html.match(
    /<div class="rn-product-imgbox">\s*<img src='([^']+)'/,
  );
  if (posterMatch) {
    posterUrl = posterMatch[1];
  } else if (ldImageUrl) {
    posterUrl = ldImageUrl;
  }
  // URL 정규화 (protocol-relative)
  if (posterUrl && posterUrl.startsWith('//')) {
    posterUrl = `https:${posterUrl}`;
  }

  // ── 등급 ──
  let ageRating: string | null = null;
  const ratingMatch = html.match(
    /<dt>등급<\/dt>\s*<dd>&nbsp;([^<]+)<\/dd>/,
  );
  if (ratingMatch) {
    ageRating = ratingMatch[1].trim();
  }

  // ── 관람시간 ──
  let runtime: number | null = null;
  const runtimeMatch = html.match(
    /<dt>관람시간<\/dt>\s*<dd>&nbsp;(\d+)분/,
  );
  if (runtimeMatch) {
    runtime = parseInt(runtimeMatch[1]);
  }

  // ── 장르 ──
  let genre: Genre = Genre.CONCERT;
  const genreMatch = html.match(
    /<p class="rn-location"><a[^>]*>([^<]+)<\/a>/,
  );
  if (genreMatch) {
    genre = GENRE_MAP[genreMatch[1].trim()] ?? Genre.OTHER;
  }

  // ── 주최/기획 ──
  let organizer: string | null = null;
  const orgMatch = html.match(
    /<td id="tdPerfOrganization">([^<]+)<\/td>/,
  );
  if (orgMatch) {
    organizer = orgMatch[1].trim();
  }

  // ── 공연시간 안내에서 회차 스케줄 파싱 ──
  const schedules: Array<{ dateTime: string }> = [];
  const timeMatch = html.match(
    /<dt>공연시간 안내<\/dt>\s*<dd>([\s\S]*?)<\/dd>/,
  );
  if (timeMatch) {
    const timeText = timeMatch[1].replace(/<[^>]*>/g, '\n');
    const timeEntries = timeText.matchAll(
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^)]*\)\s*(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g,
    );
    for (const m of timeEntries) {
      const d = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      let hour = parseInt(m[5]);
      if (m[4] === '오후' && hour < 12) hour += 12;
      if (m[4] === '오전' && hour === 12) hour = 0;
      const min = m[6] ? m[6].padStart(2, '0') : '00';
      schedules.push({
        dateTime: `${d}T${String(hour).padStart(2, '0')}:${min}:00+09:00`,
      });
    }
  }

  // Fallback: JSON-LD 날짜
  if (schedules.length === 0 && ldStartDate) {
    schedules.push({
      dateTime: `${ldStartDate}T00:00:00+09:00`,
    });
    if (ldEndDate && ldEndDate !== ldStartDate) {
      schedules.push({
        dateTime: `${ldEndDate}T00:00:00+09:00`,
      });
    }
  }

  // ── Venue ──
  let venue: FetchedPerformance['venue'] = null;
  if (ldVenueName) {
    venue = {
      name: ldVenueName,
      address: ldAddress,
      latitude: null,
      longitude: null,
    };
  }

  // 아티스트 이름 추출 (ldPerformer는 이미 JSON-LD에서 추출됨)
  const performers: string[] = [];
  if (ldPerformer) {
    performers.push(
      ...ldPerformer.split(/[,、/]/).map((s) => s.trim()).filter(Boolean),
    );
  }
  const artistNames = extractArtistNames(ldTitle, { performers });

  return {
    title: ldTitle,
    subtitle: null,
    genre,
    ageRating,
    runtime,
    intermission: null,
    posterUrl,
    venue,
    organizer,
    schedules,
    tickets: [],
    source: {
      platform: TicketPlatform.YES24,
      externalId,
      sourceUrl,
      ticketOpenAt: null,
      bookingEndAt: null,
      salesStatus: null,
    },
    artistNames,
  };
}
