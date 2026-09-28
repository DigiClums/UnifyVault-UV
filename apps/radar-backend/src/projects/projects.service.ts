import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ProjectStage, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { ResearchService } from '../research/research.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly researchService: ResearchService,
  ) {}

  async getProjects(filter?: {
    stage?: ProjectStage;
    status?: VerificationStatus;
    search?: string;
    minScore?: number;
    sort?: 'score' | 'detected' | 'name';
  }) {
    const where: any = {};

    if (filter?.stage) where.stage = filter.stage;
    if (filter?.status) where.status = filter.status;
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        githubRepository: true,
        signals: {
          orderBy: { detectedAt: 'desc' },
          take: 3,
        },
        contracts: true,
        scores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        firstDetectedAt: 'desc',
      },
    });

    const mapped = projects.map((p) => {
      const latestScore = p.scores[0] || null;
      return {
        ...p,
        latestScore,
      };
    });

    if (filter?.sort === 'score') {
      return mapped.sort(
        (a, b) => (b.latestScore?.totalScore || 0) - (a.latestScore?.totalScore || 0),
      );
    }

    return mapped;
  }

  async getProjectBySlugOrId(identifier: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        githubRepository: true,
        signals: { orderBy: { detectedAt: 'desc' } },
        contracts: true,
        scores: { orderBy: { calculatedAt: 'desc' }, take: 10 },
        researchReports: { orderBy: { generatedAt: 'desc' }, take: 1 },
        timelineEvents: { orderBy: { eventDate: 'desc' } },
        outcomes: { orderBy: { observedAt: 'desc' } },
        externalDiscoveries: { orderBy: { discoveredAt: 'desc' } },
        snapshots: { orderBy: { snapshotDate: 'desc' }, take: 30 },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project not found with identifier: ${identifier}`);
    }

    return project;
  }

  async getSignals(identifier: string) {
    const project = await this.getProjectBySlugOrId(identifier);
    return this.prisma.projectSignal.findMany({
      where: { projectId: project.id },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getTimeline(identifier: string) {
    const project = await this.getProjectBySlugOrId(identifier);
    return this.prisma.projectTimelineEvent.findMany({
      where: { projectId: project.id },
      orderBy: { eventDate: 'desc' },
    });
  }

  async getResearch(identifier: string) {
    const project = await this.getProjectBySlugOrId(identifier);
    let report = await this.prisma.researchReport.findFirst({
      where: { projectId: project.id },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) {
      report = await this.researchService.generateReportForProject(project.id);
    }
    return report;
  }

  async recalculateScore(identifier: string) {
    const project = await this.getProjectBySlugOrId(identifier);
    const repo = project.githubRepository;
    const signals = project.signals;
    const contracts = project.contracts;

    const scoreResult = this.scoringService.calculateScore({
      name: project.name,
      description: project.description,
      repo: repo
        ? {
            stars: repo.stars,
            forks: repo.forks,
            contributors: repo.contributors,
            recentCommits: repo.recentCommits,
            language: repo.language,
            topics: repo.topics,
            createdAtGithub: repo.createdAtGithub || project.githubCreatedAt,
          }
        : null,
      contracts: contracts.map((c) => ({ chain: c.chain, verified: c.verified })),
      signals,
      websiteUrl: project.websiteUrl,
      docsUrl: project.docsUrl,
      xUrl: project.xUrl,
      discordUrl: project.discordUrl,
    });

    const ghCreated = repo?.createdAtGithub || project.githubCreatedAt;
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        githubCreatedAt: ghCreated,
        isTutorialOrFork: scoreResult.isTutorialOrFork,
        earlynessScore: scoreResult.earlynessScore,
        detectionLagDays: scoreResult.detectionLagDays,
        whyDetected: scoreResult.whyDetected,
        whyNotDetected: scoreResult.whyNotDetected,
      },
    });

    const snapshot = await this.prisma.scoreSnapshot.create({
      data: {
        projectId: project.id,
        developmentScore: scoreResult.developmentScore,
        onchainScore: scoreResult.onchainScore,
        communityScore: scoreResult.communityScore,
        fundingScore: scoreResult.fundingScore,
        productScore: scoreResult.productScore,
        incentiveScore: scoreResult.incentiveScore,
        totalScore: scoreResult.totalScore,
        earlynessScore: scoreResult.earlynessScore,
        explanations: scoreResult.explanations,
      },
    });

    return snapshot;
  }

  async verifyProject(
    identifier: string,
    data: {
      status: VerificationStatus;
      stage?: ProjectStage;
      notes?: string;
    },
  ) {
    const project = await this.getProjectBySlugOrId(identifier);

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        status: data.status,
        stage: data.stage || project.stage,
      },
    });

    await this.prisma.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'MANUAL_VERIFICATION',
        title: `Verification Status Updated to ${data.status}`,
        description:
          data.notes ||
          `Research team verified project status: ${data.status}, stage: ${data.stage || project.stage}`,
        eventDate: new Date(),
      },
    });

    return updated;
  }

  async addTimelineEvent(
    identifier: string,
    data: {
      eventType: string;
      title: string;
      description: string;
      sourceUrl?: string;
      eventDate?: Date;
    },
  ) {
    const project = await this.getProjectBySlugOrId(identifier);
    return this.prisma.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        sourceUrl: data.sourceUrl,
        eventDate: data.eventDate || new Date(),
      },
    });
  }

  async addSource(
    identifier: string,
    data: {
      websiteUrl?: string;
      docsUrl?: string;
      xUrl?: string;
      discordUrl?: string;
    },
  ) {
    const project = await this.getProjectBySlugOrId(identifier);
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        websiteUrl: data.websiteUrl || project.websiteUrl,
        docsUrl: data.docsUrl || project.docsUrl,
        xUrl: data.xUrl || project.xUrl,
        discordUrl: data.discordUrl || project.discordUrl,
      },
    });

    await this.recalculateScore(project.id);
    return updated;
  }
}
