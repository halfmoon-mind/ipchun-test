import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oneSignal: OneSignalService,
  ) {}

  /** 특정 공연의 팔로워 중 OneSignal player ID가 등록된 유저 목록 반환 */
  private async getFollowerPlayerIds(artistIds: string[]): Promise<string[]> {
    const follows = await this.prisma.userFollowArtist.findMany({
      where: { artistId: { in: artistIds } },
      include: { user: { select: { oneSignalPlayerId: true } } },
    });
    const ids = follows
      .map((f) => f.user.oneSignalPlayerId)
      .filter((id): id is string => id !== null);
    return [...new Set(ids)];
  }

  /** 매일 오전 9시 — D-1 공연 알림 */
  async sendDayBeforeAlerts(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const performances = await this.prisma.performance.findMany({
      where: {
        schedules: { some: { dateTime: { gte: start, lte: end } } },
      },
      include: {
        artists: { select: { artistId: true } },
        schedules: { where: { dateTime: { gte: start, lte: end } }, orderBy: { dateTime: 'asc' } },
      },
    });

    for (const perf of performances) {
      const artistIds = perf.artists.map((a) => a.artistId);
      const playerIds = await this.getFollowerPlayerIds(artistIds);
      if (playerIds.length === 0) continue;

      const schedule = perf.schedules[0];
      const timeStr = schedule
        ? new Date(schedule.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '';

      await this.oneSignal.sendToPlayers({
        playerIds,
        title: '공연 D-1 알림',
        body: `내일 ${timeStr} — ${perf.title}`,
        data: { performanceId: perf.id, type: 'd_minus_1' },
      });

      this.logger.log(`D-1 alert sent for performance ${perf.id} to ${playerIds.length} users`);
    }
  }

  /** 1시간마다 — 티켓 오픈 감지 알림 */
  async sendTicketOpenAlerts(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const sources = await this.prisma.performanceSource.findMany({
      where: { ticketOpenAt: { gte: oneHourAgo, lte: now } },
      include: {
        performance: {
          include: {
            artists: { select: { artistId: true } },
          },
        },
      },
    });

    for (const source of sources) {
      const perf = source.performance;
      const artistIds = perf.artists.map((a) => a.artistId);
      const playerIds = await this.getFollowerPlayerIds(artistIds);
      if (playerIds.length === 0) continue;

      await this.oneSignal.sendToPlayers({
        playerIds,
        title: '티켓 오픈!',
        body: `${perf.title} 티켓이 오픈되었습니다`,
        data: { performanceId: perf.id, sourceUrl: source.sourceUrl, type: 'ticket_open' },
      });

      this.logger.log(`Ticket open alert sent for performance ${perf.id} to ${playerIds.length} users`);
    }
  }
}
