import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { GitHubModule } from './github/github.module';
import { SignalsModule } from './signals/signals.module';
import { ScoringModule } from './scoring/scoring.module';
import { ResearchModule } from './research/research.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ProjectsModule } from './projects/projects.module';
import { AlertsModule } from './alerts/alerts.module';
import { ValidationModule } from './validation/validation.module';
import { XIntegrationModule } from './x-integration/x-integration.module';
import { InvestigationModule } from './investigation/investigation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    GitHubModule,
    SignalsModule,
    ScoringModule,
    ResearchModule,
    DiscoveryModule,
    ProjectsModule,
    AlertsModule,
    ValidationModule,
    XIntegrationModule,
    InvestigationModule,
  ],
})
export class AppModule {}
