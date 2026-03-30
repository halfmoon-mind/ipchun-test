import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

const NOL_API = 'https://api-ticketfront.interpark.com';

export function isInterparkUrl(url: string): boolean {
  return /^https?:\/\/(tickets?\.|nol\.)?interpark\.com\/(goods|ticket)\//.test(url);
}

/** URL에서 NOL goodsId 추출 (e.g. "26003047") */
function extractGoodsId(url: string): string | null {
  const match = url.match(/\/goods\/(\d+)/);
  return match ? match[1] : null;
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

/** NOL summary API를 호출하여 ScrapedSchedule 반환 */
async function fetchNolSummary(
  goodsId: string,
  sourceUrl: string,
): Promise<ScrapedSchedule> {
  const headers: Record<string, string> = {
    Referer: `https://tickets.interpark.com/goods/${goodsId}`,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    Accept: 'application/json',
  };

  const res = await fetch(`${NOL_API}/v1/goods/${goodsId}/summary`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`NOL summary API 실패: ${res.status}`);
  }

  const raw: any = await res.json();
  const summary: any = raw.data ?? raw;

  let posterUrl: string | null = summary.goodsLargeImageUrl || null;
  if (posterUrl && posterUrl.startsWith('//')) {
    posterUrl = `https:${posterUrl}`;
  }

  const startDate = parseNolDate(summary.playStartDate);
  const endDate = parseNolDate(summary.playEndDate);

  return {
    title: summary.goodsName || null,
    description: summary.contents || null,
    startDate,
    endDate,
    location: summary.placeName || null,
    address: null,
    imageUrl: posterUrl,
    images: posterUrl ? [posterUrl] : [],
    sourceUrl,
    source: 'interpark',
  };
}

export async function parseInterpark(url: string): Promise<ScrapedSchedule> {
  // NOL(tickets.interpark.com) URL인 경우 API 직접 호출 우선 시도
  const goodsId = extractGoodsId(url);
  if (goodsId) {
    try {
      const result = await fetchNolSummary(goodsId, url);
      if (result.title) {
        return result;
      }
    } catch {
      // API 실패 시 OG 태그 파싱으로 fallback
    }
  }

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
