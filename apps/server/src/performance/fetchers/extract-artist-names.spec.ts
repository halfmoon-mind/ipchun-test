import { extractArtistNames } from './extract-artist-names';

describe('extractArtistNames', () => {
  describe('구조화 데이터 우선', () => {
    it('performers 배열이 있으면 그대로 반환', () => {
      const result = extractArtistNames('아무 타이틀', { performers: ['정우'] });
      expect(result).toEqual(['정우']);
    });

    it('performers + 제목 추출 결과를 중복 제거하여 합침', () => {
      const result = extractArtistNames('정우 단독 공연', { performers: ['정우'] });
      expect(result).toEqual(['정우']);
    });

    it('performers가 비어있으면 제목에서 추출', () => {
      const result = extractArtistNames('정우 단독 공연', { performers: [] });
      expect(result).toEqual(['정우']);
    });
  });

  describe('대괄호 패턴 [아티스트]', () => {
    it('대괄호 안의 이름을 추출', () => {
      const result = extractArtistNames('영등포아트홀 기획공연 [정우]');
      expect(result).toEqual(['정우']);
    });

    it('여러 대괄호를 모두 추출', () => {
      const result = extractArtistNames('[혁오] x [잔나비] 합동 공연');
      expect(result).toEqual(['혁오', '잔나비']);
    });
  });

  describe('키워드 앞 아티스트 추출', () => {
    it('"X 콘서트" 패턴', () => {
      const result = extractArtistNames('혁오 콘서트');
      expect(result).toEqual(['혁오']);
    });

    it('"X 단독 공연" 패턴', () => {
      const result = extractArtistNames('2025 정우 단독 공연〈Ding!〉');
      expect(result).toEqual(['정우']);
    });

    it('"X 단독콘서트" 패턴', () => {
      const result = extractArtistNames('LUCY 단독콘서트 PANORAMA');
      expect(result).toEqual(['LUCY']);
    });

    it('"X 내한 공연" 패턴', () => {
      const result = extractArtistNames('Cigarettes After Sex 내한 공연');
      expect(result).toEqual(['Cigarettes After Sex']);
    });

    it('"X 전국투어" 패턴', () => {
      const result = extractArtistNames('2026 잔나비 전국투어');
      expect(result).toEqual(['잔나비']);
    });

    it('"X 라이브" 패턴', () => {
      const result = extractArtistNames('실리카겔 라이브 in Seoul');
      expect(result).toEqual(['실리카겔']);
    });

    it('연도 접두사 제거', () => {
      const result = extractArtistNames('2026 LUCY 콘서트');
      expect(result).toEqual(['LUCY']);
    });
  });

  describe('추출 불가능한 경우', () => {
    it('패턴이 없으면 빈 배열', () => {
      const result = extractArtistNames('영등포아트홀 기획공연 봄맞이 특별 무대');
      expect(result).toEqual([]);
    });
  });

  describe('정리', () => {
    it('앞뒤 공백 제거', () => {
      const result = extractArtistNames('[ 정우 ] 콘서트');
      expect(result).toEqual(['정우']);
    });

    it('중복 제거', () => {
      const result = extractArtistNames('[혁오] 혁오 콘서트');
      expect(result).toEqual(['혁오']);
    });
  });
});
