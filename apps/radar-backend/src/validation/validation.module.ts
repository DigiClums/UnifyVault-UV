import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { ValidationController } from './validation.controller';
import { ValidationCron } from './validation.cron';

@Module({
  providers: [ValidationService, ValidationCron],
  controllers: [ValidationController],
  exports: [ValidationService],
})
export class ValidationModule {}
