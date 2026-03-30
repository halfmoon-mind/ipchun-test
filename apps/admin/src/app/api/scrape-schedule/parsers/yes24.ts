import { ScrapedSchedule } from './types';
import { fetchHtml, extractMetaContent } from './og';

export function isYes24Url(url: string): boolean {
  return /^https?:\/\/ticket\.yes24\.com\/Perf\//i.test(url);
}

export async function parseYes24(url: string): Promise<ScrapedSchedule> {
  const html = await fetchHtml(url);

  // 첫 번째 og:title (공연 전용, 두 번째는 사이트 범용)
  let title = extractMetaContent(html, 'og:title');

  // JSON-LD에서 이벤트 정보 추출
  let description: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;
  let location: string | null = null;
  let address: string | null = null;
  let imageUrl: string | null = null;

  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld['@type'] !== 'Event') continue;

      title = title || ld.name || null;
      startDate = ld.startDate || null;
      endDate = ld.endDate || null;
      imageUrl = ld.image || null;

      if (ld.location) {
        location = ld.location.name || null;
        address =
          typeof ld.location.address === 'string'
            ? ld.location.address
            : ld.location.address?.streetAddress || null;
      }

      if (ld.performer) {
        const performerName =
          typeof ld.performer === 'string'
            ? ld.performer
            : ld.performer.name || null;
        if (performerName) {
          description = `출연: ${performerName}`;
        }
      }
      break;
    } catch {
      // JSON 파싱 실패 무시
    }
  }

  // 포스터 이미지: HTML에서 직접 추출 (og:image보다 정확)
  const posterMatch = html.match(
    /<div class="rn-product-imgbox">\s*<img src='([^']+)'/,
  );
  if (posterMatch) {
    imageUrl = posterMatch[1];
  }

  // URL 정규화
  if (imageUrl && imageUrl.startsWith('//')) {
    imageUrl = `https:${imageUrl}`;
  }

  // 페이지 내 모든 tkfile 이미지 수집
  const images: string[] = [];
  if (imageUrl) images.push(imageUrl);
  const imgMatches = html.matchAll(
    /<img[^>]*src=['"]([^'"]*tkfile\.yes24\.com\/upload[^'"]+)['"]/g,
  );
  for (const m of imgMatches) {
    let imgUrl = m[1];
    if (imgUrl.startsWith('//')) imgUrl = `https:${imgUrl}`;
    if (!images.includes(imgUrl)) {
      images.push(imgUrl);
    }
  }

  if (!title) {
    throw new Error(
      `YES24 페이지 요청 실패: 유효한 공연 데이터 없음 — ${url}`,
    );
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
    source: 'yes24',
  };
}
