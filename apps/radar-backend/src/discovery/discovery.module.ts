import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { GitHubModule } from '../github/github.module';
import { SignalsModule } from '../signals/signals.module';
import { ScoringModule } from '../scoring/scoring.module';
import { ResearchModule } from '../research/research.module';

@Module({
  imports: [GitHubModule, SignalsModule, ScoringModule, ResearchModule],
  providers: [DiscoveryService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
