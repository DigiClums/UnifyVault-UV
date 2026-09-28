import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ValidationService } from './validation.service';

@Injectable()
export class ValidationCron {
  private readonly logger = new Logger(ValidationCron.name);

  constructor(private readonly validationService: ValidationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'validation-snapshot',
  })
  async handleDailyValidationSnapshot() {
    this.logger.log('Executing automated daily validation snapshot schedule...');
    try {
      const result = await this.validationService.runDailySnapshotJob();
      this.logger.log(`Daily validation snapshot finished successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Error executing daily validation snapshot job', error);
    }
  }
}
