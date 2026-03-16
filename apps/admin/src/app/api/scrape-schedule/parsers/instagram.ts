import { ScrapedSchedule } from './types';
import { parseOg } from './og';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export function isInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\//.test(url);
}

export async function parseInstagram(url: string): Promise<ScrapedSchedule> {
  // 1. oEmbed API 시도
  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);

    if (res.ok) {
      const data: OEmbedResponse = await res.json();
      return {
        title: data.title || null,
        description: data.title || null,
        startDate: null,
        endDate: null,
        location: null,
        address: null,
        imageUrl: data.thumbnail_url || null,
        images: data.thumbnail_url ? [data.thumbnail_url] : [],
        sourceUrl: url,
        source: 'instagram',
      };
    }
  } catch {
    // oEmbed 실패 시 OG 폴백
  }

  // 2. OG 태그 폴백
  const result = await parseOg(url);
  return { ...result, source: 'instagram' };
}
