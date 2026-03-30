import { Command } from 'commander';
import { CONFIG, PLATFORMS, type Platform } from './config.js';
import { runExplore, runRetryFailures } from './runner.js';
import { printSummary } from './reporter.js';

const program = new Command();

program
  .name('autoparse')
  .description('티켓 파서 자율 검증 도구')
  .option(
    '-p, --platform <platform>',
    '대상 플랫폼 (melon|nol|ticketlink|all)',
    'all',
  )
  .option(
    '-c, --count <number>',
    '시도할 ID 수',
    String(CONFIG.defaultCount),
  )
  .option(
    '-d, --delay <ms>',
    '요청 간 딜레이 (ms)',
    String(CONFIG.delay),
  )
  .option(
    '-r, --retry-failures',
    '기존 실패 케이스만 재시도',
    false,
  )
  .action(async (opts) => {
    const platforms: Platform[] =
      opts.platform === 'all'
        ? [...PLATFORMS]
        : [opts.platform as Platform];
    const count = parseInt(opts.count, 10);
    const delay = parseInt(opts.delay, 10);

    console.log('═══ AutoParse 시작 ═══');
    console.log(
      `플랫폼: ${platforms.join(', ')} | ` +
      (opts.retryFailures
        ? '모드: 실패 재시도'
        : `개수: ${count}`) +
      ` | 딜레이: ${delay}ms`,
    );
    console.log('');

    const results = opts.retryFailures
      ? await runRetryFailures(platforms, delay)
      : await runExplore(platforms, count, delay);

    printSummary(results);
  });

program.parse();
