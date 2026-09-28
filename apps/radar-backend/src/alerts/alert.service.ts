import { Injectable, Logger } from '@nestjs/common';

export interface AlertPayload {
  projectId: string;
  projectName: string;
  stage: string;
  score: number;
  message: string;
  sourceUrl?: string;
}

export interface IAlertProvider {
  sendAlert(alert: AlertPayload): Promise<boolean>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  async logAlert(alert: AlertPayload) {
    this.logger.log(
      `[EARLY_RADAR_ALERT] Project: "${alert.projectName}" (${alert.stage}) - Score: ${alert.score}/100. ${alert.message}`,
    );
    // Pluggable for Telegram Bot, Discord Webhook, Email etc.
    return true;
  }
}
