import { Injectable, Logger } from '@nestjs/common';

interface SendNotificationParams {
  playerIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly appId = process.env.ONESIGNAL_APP_ID ?? '';
  private readonly apiKey = process.env.ONESIGNAL_REST_API_KEY ?? '';

  async sendToPlayers(params: SendNotificationParams): Promise<void> {
    if (!this.appId || !this.apiKey) {
      this.logger.warn('OneSignal credentials not set — skipping notification send');
      return;
    }
    if (params.playerIds.length === 0) return;

    const body = {
      app_id: this.appId,
      include_player_ids: params.playerIds,
      headings: { ko: params.title, en: params.title },
      contents: { ko: params.body, en: params.body },
      data: params.data ?? {},
    };

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`OneSignal send failed (${res.status}): ${text}`);
    } else {
      const json = (await res.json()) as { id: string; recipients: number };
      this.logger.log(`Notification sent: id=${json.id} recipients=${json.recipients}`);
    }
  }
}
