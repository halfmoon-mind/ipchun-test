import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { CONFIG, type Platform } from './config.js';
import type { ValidationResult } from './validator.js';

export interface RunResult {
  platform: Platform;
  externalId: string;
  url: string;
  skipped?: boolean;
  skipReason?: string;
  serverFetcher?: {
    success: boolean;
    errors: string[];
    warnings: string[];
    result: unknown;
    error?: string;
    file: string;
  };
  adminParser?: {
    success: boolean;
    errors: string[];
    warnings: string[];
    result: unknown;
    error?: string;
    file: string;
  };
  rawResponse?: string;
}

const SERVER_FILES: Record<Platform, string> = {
  melon: 'apps/server/src/performance/fetchers/melon.fetcher.ts',
  nol: 'apps/server/src/performance/fetchers/nol.fetcher.ts',
  ticketlink: 'apps/server/src/performance/fetchers/ticketlink.fetcher.ts',
  yes24: 'apps/server/src/performance/fetchers/yes24.fetcher.ts',
};

const ADMIN_FILES: Record<Platform, string> = {
  melon: 'apps/admin/src/app/api/scrape-schedule/parsers/melon.ts',
  nol: 'apps/admin/src/app/api/scrape-schedule/parsers/interpark.ts',
  ticketlink: 'apps/admin/src/app/api/scrape-schedule/parsers/ticketlink.ts',
  yes24: 'apps/admin/src/app/api/scrape-schedule/parsers/yes24.ts',
};

export function getServerFile(platform: Platform): string {
  return SERVER_FILES[platform];
}

export function getAdminFile(platform: Platform): string {
  return ADMIN_FILES[platform];
}

export function saveFailure(result: RunResult): void {
  const dir = CONFIG.failuresDir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filename = `${result.platform}-${result.externalId}.json`;
  writeFileSync(
    `${dir}/${filename}`,
    JSON.stringify(result, null, 2),
    'utf-8',
  );
}

export function printSummary(results: RunResult[]): void {
  const byPlatform = new Map<Platform, RunResult[]>();
  for (const r of results) {
    const list = byPlatform.get(r.platform) || [];
    list.push(r);
    byPlatform.set(r.platform, list);
  }

  const totalAttempted = results.length;
  const skipped = results.filter((r) => r.skipped).length;
  const tested = results.filter((r) => !r.skipped);
  const failed = tested.filter(
    (r) =>
      r.serverFetcher?.success === false ||
      r.adminParser?.success === false,
  );

  console.log('');
  console.log('═══ AutoParse 실행 결과 ═══');
  console.log(`시도: ${totalAttempted} | 유효: ${tested.length} | 스킵(404): ${skipped}`);
  console.log('');

  for (const [platform, platformResults] of byPlatform) {
    const valid = platformResults.filter((r) => !r.skipped);
    const passed = valid.filter(
      (r) =>
        r.serverFetcher?.success !== false &&
        r.adminParser?.success !== false,
    );
    const failedIds = valid
      .filter(
        (r) =>
          r.serverFetcher?.success === false ||
          r.adminParser?.success === false,
      )
      .map((r) => r.externalId);

    const failInfo =
      failedIds.length > 0
        ? ` ✗ ${failedIds.join(', ')}`
        : '';
    console.log(
      `  ${platform.padEnd(12)} ${passed.length}/${valid.length} 성공${failInfo}`,
    );
  }

  if (failed.length > 0) {
    console.log('');
    console.log('실패 상세:');
    for (const r of failed) {
      console.log(`  ${r.platform}-${r.externalId}:`);
      if (r.serverFetcher?.success === false) {
        const issues = r.serverFetcher.error
          ? [r.serverFetcher.error]
          : r.serverFetcher.errors;
        console.log(`    [server] ${issues.join(', ')}`);
      }
      if (r.adminParser?.success === false) {
        const issues = r.adminParser.error
          ? [r.adminParser.error]
          : r.adminParser.errors;
        console.log(`    [admin]  ${issues.join(', ')}`);
      }
    }
    console.log('');
    console.log(
      `실패 스냅샷: ${failed.map((r) => `data/failures/${r.platform}-${r.externalId}.json`).join(', ')}`,
    );
  }

  console.log('');
  process.exitCode = failed.length > 0 ? 1 : 0;
}
