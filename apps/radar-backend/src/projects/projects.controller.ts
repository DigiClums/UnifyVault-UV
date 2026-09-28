import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectStage, VerificationStatus } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjects(
    @Query('stage') stage?: ProjectStage,
    @Query('status') status?: VerificationStatus,
    @Query('search') search?: string,
    @Query('sort') sort?: 'score' | 'detected' | 'name',
  ) {
    return this.projectsService.getProjects({ stage, status, search, sort });
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectsService.getProjectBySlugOrId(id);
  }

  @Get(':id/signals')
  async getSignals(@Param('id') id: string) {
    return this.projectsService.getSignals(id);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.projectsService.getTimeline(id);
  }

  @Get(':id/research')
  async getResearch(@Param('id') id: string) {
    return this.projectsService.getResearch(id);
  }

  @Post(':id/recalculate-score')
  async recalculateScore(@Param('id') id: string) {
    return this.projectsService.recalculateScore(id);
  }

  @Post(':id/verify')
  async verifyProject(
    @Param('id') id: string,
    @Body() body: { status: VerificationStatus; stage?: ProjectStage; notes?: string },
  ) {
    return this.projectsService.verifyProject(id, body);
  }

  @Post(':id/timeline')
  async addTimelineEvent(
    @Param('id') id: string,
    @Body()
    body: {
      eventType: string;
      title: string;
      description: string;
      sourceUrl?: string;
      eventDate?: Date;
    },
  ) {
    return this.projectsService.addTimelineEvent(id, body);
  }

  @Post(':id/sources')
  async addSource(
    @Param('id') id: string,
    @Body() body: { websiteUrl?: string; docsUrl?: string; xUrl?: string; discordUrl?: string },
  ) {
    return this.projectsService.addSource(id, body);
  }
}
