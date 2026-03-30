import { CONFIG, type Platform } from './config.js';
import {
  loadHistory,
  pickIds,
  markTried,
  markValid,
  markFailed,
  removeFailed,
  saveHistory,
} from './id-pool.js';
import { validateFetched, validateScraped } from './validator.js';
import {
  type RunResult,
  saveFailure,
  getServerFile,
  getAdminFile,
} from './reporter.js';

const ADMIN_SOURCE_MAP: Record<Platform, string> = {
  melon: 'melon',
  nol: 'interpark',
  ticketlink: 'ticketlink',
  yes24: 'yes24',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 단일 ID에 대해 Server fetcher + Admin parser를 실행하고 검증
 */
async function runSingle(
  platform: Platform,
  externalId: string,
  delay: number,
): Promise<RunResult> {
  const url = CONFIG.urlTemplates[platform](externalId);
  const result: RunResult = { platform, externalId, url };

  // Server fetcher 실행
  try {
    let fetched: any;
    if (platform === 'melon') {
      const { fetchFromMelon } = await import(
        '../../apps/server/src/performance/fetchers/melon.fetcher.js'
      );
      fetched = await fetchFromMelon(externalId);
    } else if (platform === 'nol') {
      const { fetchFromNol } = await import(
        '../../apps/server/src/performance/fetchers/nol.fetcher.js'
      );
      fetched = await fetchFromNol(externalId);
    } else if (platform === 'yes24') {
      const { fetchFromYes24 } = await import(
        '../../apps/server/src/performance/fetchers/yes24.fetcher.js'
      );
      fetched = await fetchFromYes24(externalId);
    } else {
      const { fetchFromTicketlink } = await import(
        '../../apps/server/src/performance/fetchers/ticketlink.fetcher.js'
      );
      fetched = await fetchFromTicketlink(externalId);
    }

    const validation = validateFetched(fetched);
    result.serverFetcher = {
      success: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      result: fetched,
      file: getServerFile(platform),
    };
  } catch (err: any) {
    // 404 등 HTTP 에러 → 유효하지 않은 ID로 스킵
    if (
      err.message?.includes('404') ||
      err.message?.includes('요청 실패') ||
      err.message?.includes('API 실패')
    ) {
      result.skipped = true;
      result.skipReason = err.message;
      return result;
    }
    result.serverFetcher = {
      success: false,
      errors: [],
      warnings: [],
      result: null,
      error: err.message || String(err),
      file: getServerFile(platform),
    };
  }

  // 딜레이 (Admin 요청 전)
  await sleep(delay);

  // Admin parser 실행
  try {
    let scraped: any;
    if (platform === 'melon') {
      const { parseMelonTicket } = await import(
        '../../apps/admin/src/app/api/scrape-schedule/parsers/melon.js'
      );
      scraped = await parseMelonTicket(url);
    } else if (platform === 'nol') {
      const { parseInterpark } = await import(
        '../../apps/admin/src/app/api/scrape-schedule/parsers/interpark.js'
      );
      scraped = await parseInterpark(url);
    } else if (platform === 'yes24') {
      const { parseYes24 } = await import(
        '../../apps/admin/src/app/api/scrape-schedule/parsers/yes24.js'
      );
      scraped = await parseYes24(url);
    } else {
      const { parseTicketlink } = await import(
        '../../apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.js'
      );
      scraped = await parseTicketlink(url);
    }

    const validation = validateScraped(scraped, ADMIN_SOURCE_MAP[platform]);
    result.adminParser = {
      success: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      result: scraped,
      file: getAdminFile(platform),
    };
  } catch (err: any) {
    result.adminParser = {
      success: false,
      errors: [],
      warnings: [],
      result: null,
      error: err.message || String(err),
      file: getAdminFile(platform),
    };
  }

  return result;
}

/**
 * 메인 실행: 랜덤 ID 탐색 모드
 */
export async function runExplore(
  platforms: Platform[],
  count: number,
  delay: number,
): Promise<RunResult[]> {
  const history = loadHistory();
  const allResults: RunResult[] = [];

  for (const platform of platforms) {
    const ids = pickIds(platform, count, history);
    console.log(`[${platform}] ${ids.length}개 ID 시도 예정`);

    for (const id of ids) {
      process.stdout.write(`  ${platform}-${id} ... `);
      const result = await runSingle(platform, id, delay);
      markTried(history, platform, id);

      if (result.skipped) {
        console.log(`스킵 (${result.skipReason})`);
      } else {
        const serverOk = result.serverFetcher?.success !== false;
        const adminOk = result.adminParser?.success !== false;
        markValid(history, platform, id);

        if (serverOk && adminOk) {
          removeFailed(history, platform, id);
          console.log('✓ 통과');
        } else {
          markFailed(history, platform, id);
          saveFailure(result);
          console.log('✗ 실패');
        }
      }

      allResults.push(result);
      saveHistory(history);

      // 다음 ID 전 딜레이
      if (ids.indexOf(id) < ids.length - 1) {
        await sleep(delay);
      }
    }
  }

  return allResults;
}

/**
 * 기존 실패 케이스 재시도 모드
 */
export async function runRetryFailures(
  platforms: Platform[],
  delay: number,
): Promise<RunResult[]> {
  const history = loadHistory();
  const allResults: RunResult[] = [];

  for (const platform of platforms) {
    const failedIds = history[platform].failed;
    if (failedIds.length === 0) {
      console.log(`[${platform}] 실패 케이스 없음`);
      continue;
    }

    console.log(`[${platform}] ${failedIds.length}개 실패 케이스 재시도`);

    for (const id of [...failedIds]) {
      process.stdout.write(`  ${platform}-${id} (재시도) ... `);
      const result = await runSingle(platform, id, delay);

      const serverOk = result.serverFetcher?.success !== false;
      const adminOk = result.adminParser?.success !== false;

      if (serverOk && adminOk) {
        removeFailed(history, platform, id);
        console.log('✓ 통과 (수정됨)');
      } else {
        saveFailure(result);
        console.log('✗ 여전히 실패');
      }

      allResults.push(result);
      saveHistory(history);

      await sleep(delay);
    }
  }

  return allResults;
}
