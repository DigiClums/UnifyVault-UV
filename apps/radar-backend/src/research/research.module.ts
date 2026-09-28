import { Module } from '@nestjs/common';
import { ResearchService } from './research.service';
import { DeterministicResearchProvider } from './deterministic-research.provider';

@Module({
  providers: [ResearchService, DeterministicResearchProvider],
  exports: [ResearchService, DeterministicResearchProvider],
})
export class ResearchModule {}
