import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ValidationService,
  RecordOutcomeDto,
  RecordExternalDiscoveryDto,
  RejectProjectDto,
} from './validation.service';

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Get('summary')
  async getSummary() {
    return this.validationService.getValidationSummary();
  }

  @Post('projects/:id/outcome')
  async recordOutcome(@Param('id') id: string, @Body() body: RecordOutcomeDto) {
    return this.validationService.recordOutcome(id, body);
  }

  @Post('projects/:id/external-discovery')
  async recordExternalDiscovery(@Param('id') id: string, @Body() body: RecordExternalDiscoveryDto) {
    return this.validationService.recordExternalDiscovery(id, body);
  }

  @Post('projects/:id/reject')
  async rejectProject(@Param('id') id: string, @Body() body: RejectProjectDto) {
    return this.validationService.rejectProject(id, body);
  }

  @Post('snapshot/run')
  async runSnapshotJob() {
    return this.validationService.runDailySnapshotJob();
  }
}
