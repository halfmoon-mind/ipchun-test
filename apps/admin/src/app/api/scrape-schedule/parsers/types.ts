export interface ScrapedSchedule {
  title: string | null;
  description: string | null;
  startDate: string | null;    // ISO 8601
  endDate: string | null;      // ISO 8601
  location: string | null;     // 장소명
  address: string | null;      // 주소
  imageUrl: string | null;     // 대표 포스터/이미지
  images: string[];            // 모든 이미지 URL (포스터, 상세정보, 라인업 등)
  sourceUrl: string;           // 원본 링크
  source: 'instagram' | 'interpark' | 'ticketlink' | 'melon' | 'yes24' | 'og' | 'unknown';
}
