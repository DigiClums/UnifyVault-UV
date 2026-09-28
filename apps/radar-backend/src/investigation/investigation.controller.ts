import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { InvestigationService } from './investigation.service';
import { DeepInvestigationReport } from './investigation.types';

@Controller('investigation')
export class InvestigationController {
  constructor(private readonly investigationService: InvestigationService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runInvestigation(
    @Body()
    body: {
      xUrl?: string;
      githubUrl?: string;
      projectId?: string;
      textSnippet?: string;
      authorName?: string;
      authorUsername?: string;
    },
  ): Promise<DeepInvestigationReport> {
    return this.investigationService.investigateEntity(body);
  }
}
