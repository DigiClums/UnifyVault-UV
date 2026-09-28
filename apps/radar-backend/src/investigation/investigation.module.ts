import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GitHubModule } from '../github/github.module';
import { InvestigationService } from './investigation.service';
import { InvestigationController } from './investigation.controller';

@Module({
  imports: [PrismaModule, GitHubModule],
  controllers: [InvestigationController],
  providers: [InvestigationService],
  exports: [InvestigationService],
})
export class InvestigationModule {}
