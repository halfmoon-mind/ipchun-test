import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketPlatform } from '@ipchun/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceService } from './performance.service';
import { fetchFromMelon } from './fetchers/melon.fetcher';
import { fetchFromNol } from './fetchers/nol.fetcher';
import { fetchFromTicketlink } from './fetchers/ticketlink.fetcher';
import { fetchFromYes24 } from './fetchers/yes24.fetcher';
import type { FetchedPerformance } from '@ipchun/shared';

// Seed IDs per platform — starting points for adjacent-ID scanning
const PLATFORM_SEEDS: Record<string, string[]> = {
  MELON: ['212880', '212890', '212900', '212910', '212920', '213000', '213100'],
  NOL: ['25026379', '25026380', '25026381'],
  TICKETLINK: ['248700', '248710', '248720'],
  YES24: ['201700', '201710', '201720'],
};

const ADJACENT_RANGE = 20;
const DEFAULT_BATCH_SIZE = 30;

export interface ScanResult {
  platform: string;
  tried: number;
  registered: number;
  skipped: number;
  failed: number;
}

@Injectable()
export class BatchScanService {
  private readonly logger = new Logger(BatchScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceService: PerformanceService,
  ) {}

  /** Scheduled: run every 2 hours */
  @Cron('0 */2 * * *')
  async scheduledScan() {
    this.logger.log('Scheduled batch scan started');
    for (const platform of Object.values(TicketPlatform)) {
      try {
        await this.scanPlatform(platform as TicketPlatform, DEFAULT_BATCH_SIZE);
      } catch (err) {
        this.logger.error(`Batch scan failed for ${platform}: ${err}`);
      }
    }
  }

  async scanPlatform(platform: TicketPlatform, count = DEFAULT_BATCH_SIZE): Promise<ScanResult> {
    const result: ScanResult = { platform, tried: 0, registered: 0, skipped: 0, failed: 0 };

    const candidateIds = await this.pickCandidateIds(platform, count);
    this.logger.log(`[${platform}] Scanning ${candidateIds.length} candidate IDs`);

    for (const externalId of candidateIds) {
      result.tried++;
      await this.scanOne(platform, externalId, result);
    }

    this.logger.log(
      `[${platform}] Done — tried: ${result.tried}, registered: ${result.registered}, skipped: ${result.skipped}, failed: ${result.failed}`,
    );
    return result;
  }

  private async scanOne(platform: TicketPlatform, externalId: string, result: ScanResult) {
    // Skip if already processed
    const existing = await this.prisma.scanLog.findUnique({
      where: { platform_externalId: { platform, externalId } },
    });
    if (existing) {
      result.skipped++;
      return;
    }

    // Also skip if already registered via a different path
    const alreadyRegistered = await this.prisma.performanceSource.findUnique({
      where: { platform_externalId: { platform, externalId } },
    });
    if (alreadyRegistered) {
      await this.upsertScanLog(platform, externalId, 'SKIPPED', 'already_registered', alreadyRegistered.performanceId);
      result.skipped++;
      return;
    }

    let fetched: FetchedPerformance;
    try {
      fetched = await this.fetchById(platform, externalId);
    } catch (err: any) {
      await this.upsertScanLog(platform, externalId, 'FAILED', String(err?.message ?? err).slice(0, 200));
      result.failed++;
      return;
    }

    // Apply genre/keyword filters (mirrors PerformanceService exclusion rules)
    try {
      const performance = await this.performanceService.createFromFetched(platform, externalId, fetched);
      await this.upsertScanLog(platform, externalId, 'REGISTERED', undefined, performance.id);
      result.registered++;
      this.logger.log(`[${platform}:${externalId}] Registered: "${fetched.title}"`);
    } catch (err: any) {
      const reason = String(err?.message ?? err).slice(0, 200);
      const isFiltered = /장르|아닌 것으로|EXCLUDED/.test(reason);
      await this.upsertScanLog(platform, externalId, isFiltered ? 'SKIPPED' : 'FAILED', reason);
      if (isFiltered) result.skipped++;
      else result.failed++;
    }
  }

  private async fetchById(platform: TicketPlatform, externalId: string): Promise<FetchedPerformance> {
    switch (platform) {
      case TicketPlatform.MELON: return fetchFromMelon(externalId);
      case TicketPlatform.NOL: return fetchFromNol(externalId);
      case TicketPlatform.TICKETLINK: return fetchFromTicketlink(externalId);
      case TicketPlatform.YES24: return fetchFromYes24(externalId);
      default: throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async upsertScanLog(
    platform: TicketPlatform,
    externalId: string,
    status: 'DISCOVERED' | 'REGISTERED' | 'SKIPPED' | 'FAILED',
    reason?: string,
    performanceId?: string,
  ) {
    await this.prisma.scanLog.upsert({
      where: { platform_externalId: { platform, externalId } },
      create: { platform, externalId, status, reason, performanceId },
      update: { status, reason, performanceId, scannedAt: new Date() },
    });
  }

  /**
   * Build candidate ID list: seeds → adjacent to already-registered IDs → adjacent to seeds
   */
  private async pickCandidateIds(platform: TicketPlatform, count: number): Promise<string[]> {
    const triedIds = new Set(
      (await this.prisma.scanLog.findMany({ where: { platform }, select: { externalId: true } }))
        .map((r) => r.externalId),
    );
    const registeredSources = await this.prisma.performanceSource.findMany({
      where: { platform },
      select: { externalId: true },
      orderBy: { lastSyncedAt: 'desc' },
      take: 50,
    });
    const registeredIds = registeredSources.map((s) => s.externalId);

    const seeds = PLATFORM_SEEDS[platform] ?? [];
    const result: string[] = [];

    // 1. Untried seeds first
    for (const id of seeds) {
      if (result.length >= count) break;
      if (!triedIds.has(id)) result.push(id);
    }

    // 2. Adjacent to recently registered IDs
    const baseCandidates: string[] = [];
    const baseIds = registeredIds.length > 0 ? registeredIds : seeds;
    for (const baseId of baseIds) {
      const num = parseInt(baseId, 10);
      if (isNaN(num)) continue;
      for (let offset = -ADJACENT_RANGE; offset <= ADJACENT_RANGE; offset++) {
        const candidate = String(num + offset);
        if (!triedIds.has(candidate) && !result.includes(candidate)) {
          baseCandidates.push(candidate);
        }
      }
    }

    // Shuffle and fill
    for (let i = baseCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseCandidates[i], baseCandidates[j]] = [baseCandidates[j], baseCandidates[i]];
    }
    for (const c of baseCandidates) {
      if (result.length >= count) break;
      result.push(c);
    }

    return result.slice(0, count);
  }

  async getScanStats(): Promise<Record<string, Record<string, number>>> {
    const logs = await this.prisma.scanLog.groupBy({
      by: ['platform', 'status'],
      _count: { id: true },
    });
    const stats: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      if (!stats[log.platform]) stats[log.platform] = {};
      stats[log.platform][log.status] = log._count.id;
    }
    return stats;
  }
}
