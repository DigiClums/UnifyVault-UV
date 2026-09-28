import { Module } from '@nestjs/common';
import { SignalsService } from './signals.service';

@Module({
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
