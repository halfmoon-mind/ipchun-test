import type { FetchedPerformance } from '@ipchun/shared';

interface ScrapedSchedule {
  title: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  images: string[];
  sourceUrl: string;
  source: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isValidIsoDate(s: string): boolean {
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function isValidUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://');
}

/**
 * Server fetcher 결과 (FetchedPerformance) 검증
 */
export function validateFetched(result: FetchedPerformance): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수: title
  if (!result.title || result.title.trim() === '') {
    errors.push('title이 비어있음');
  }

  // 필수: posterUrl
  if (!result.posterUrl) {
    errors.push('posterUrl이 null');
  } else if (!isValidUrl(result.posterUrl)) {
    errors.push(`posterUrl이 유효한 URL이 아님: ${result.posterUrl}`);
  }

  // 필수: venue
  if (!result.venue) {
    warnings.push('venue가 null');
  } else if (!result.venue.name || result.venue.name.trim() === '') {
    errors.push('venue.name이 비어있음');
  }

  // 필수: schedules (최소 1개)
  if (result.schedules.length === 0) {
    errors.push('schedules가 비어있음');
  } else {
    for (const s of result.schedules) {
      if (!isValidIsoDate(s.dateTime)) {
        errors.push(`schedule 날짜가 유효하지 않음: ${s.dateTime}`);
      }
    }
  }

  // 스케줄 날짜 순서 검증
  if (result.schedules.length >= 2) {
    const dates = result.schedules.map((s) => new Date(s.dateTime).getTime());
    const first = Math.min(...dates);
    const last = Math.max(...dates);
    if (first > last) {
      warnings.push('schedules 날짜 순서가 뒤바뀜');
    }
  }

  // 티켓 검증
  if (result.tickets.length === 0) {
    warnings.push('tickets가 비어있음 (무료 공연일 수 있음)');
  } else {
    for (const t of result.tickets) {
      if (!t.seatGrade || t.seatGrade.trim() === '') {
        errors.push('ticket seatGrade가 비어있음');
      }
      if (t.price < 0) {
        errors.push(`ticket 가격이 음수: ${t.price}`);
      }
    }
  }

  // genre 검증
  const validGenres = ['CONCERT', 'MUSICAL', 'PLAY', 'CLASSIC', 'FESTIVAL', 'BUSKING', 'RELEASE', 'OTHER'];
  if (!validGenres.includes(result.genre)) {
    errors.push(`genre가 유효하지 않음: ${result.genre}`);
  }
  if (result.genre === 'OTHER') {
    warnings.push('genre가 OTHER로 분류됨');
  }

  // source 검증
  if (!result.source.externalId) {
    errors.push('source.externalId가 비어있음');
  }
  if (!result.source.sourceUrl || !isValidUrl(result.source.sourceUrl)) {
    errors.push('source.sourceUrl이 유효하지 않음');
  }
  if (!result.source.salesStatus) {
    warnings.push('source.salesStatus가 null');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Admin parser 결과 (ScrapedSchedule) 검증
 */
export function validateScraped(result: ScrapedSchedule, expectedSource: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 필수: title
  if (!result.title || result.title.trim() === '') {
    errors.push('title이 비어있음');
  }

  // 필수: imageUrl
  if (!result.imageUrl) {
    warnings.push('imageUrl이 null');
  } else if (!isValidUrl(result.imageUrl)) {
    errors.push(`imageUrl이 유효한 URL이 아님: ${result.imageUrl}`);
  }

  // startDate 검증 (있는 경우)
  if (result.startDate && !isValidIsoDate(result.startDate)) {
    errors.push(`startDate가 유효하지 않음: ${result.startDate}`);
  }
  if (result.endDate && !isValidIsoDate(result.endDate)) {
    errors.push(`endDate가 유효하지 않음: ${result.endDate}`);
  }

  // startDate/endDate 순서
  if (result.startDate && result.endDate) {
    if (new Date(result.startDate) > new Date(result.endDate)) {
      errors.push('startDate가 endDate 이후임');
    }
  }

  // location 검증
  if (!result.location) {
    warnings.push('location이 null');
  }

  // source 식별 검증
  if (result.source !== expectedSource) {
    errors.push(`source 불일치: expected=${expectedSource}, got=${result.source}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
