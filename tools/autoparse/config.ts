export const CONFIG = {
  /** 요청 간 딜레이 (ms) */
  delay: 2000,
  /** 한 번 실행에 시도할 기본 ID 수 */
  defaultCount: 20,
  /** 인접 ID 탐색 범위 (시드 기준 ±N) */
  adjacentRange: 50,
  /** 플랫폼별 URL 템플릿 */
  urlTemplates: {
    melon: (id: string) =>
      `https://ticket.melon.com/performance/index.htm?prodId=${id}`,
    nol: (id: string) =>
      `https://tickets.interpark.com/goods/${id}`,
    ticketlink: (id: string) =>
      `https://www.ticketlink.co.kr/product/${id}`,
  },
  /** data 디렉토리 경로 */
  dataDir: new URL('./data', import.meta.url).pathname,
  /** failures 디렉토리 경로 */
  failuresDir: new URL('./data/failures', import.meta.url).pathname,
  /** history 파일 경로 */
  historyPath: new URL('./data/history.json', import.meta.url).pathname,
  /** seeds 파일 경로 */
  seedsPath: new URL('./seeds.json', import.meta.url).pathname,
} as const;

export type Platform = 'melon' | 'nol' | 'ticketlink';
export const PLATFORMS: Platform[] = ['melon', 'nol', 'ticketlink'];
