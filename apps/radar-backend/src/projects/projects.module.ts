import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { ResearchModule } from '../research/research.module';

@Module({
  imports: [ScoringModule, ResearchModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
