import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notificationService: NotificationService) {}

  /** 매일 오전 9시 KST (UTC 0시) — D-1 공연 알림 */
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async handleDayBeforeAlerts() {
    this.logger.log('Running D-1 performance alerts');
    await this.notificationService.sendDayBeforeAlerts();
  }

  /** 1시간마다 — 티켓 오픈 감지 */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTicketOpenAlerts() {
    this.logger.log('Running ticket open alerts');
    await this.notificationService.sendTicketOpenAlerts();
  }
}
