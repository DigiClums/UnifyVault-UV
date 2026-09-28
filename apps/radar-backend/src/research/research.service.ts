import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicResearchProvider } from './deterministic-research.provider';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly researchProvider: DeterministicResearchProvider,
  ) {}

  async generateReportForProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        signals: true,
        githubRepository: true,
        scores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const reportData = await this.researchProvider.generateReport({
      name: project.name,
      description: project.description,
      githubUrl: project.githubUrl,
      websiteUrl: project.websiteUrl,
      docsUrl: project.docsUrl,
      stage: project.stage,
      signals: project.signals.map((s) => ({
        type: s.type,
        title: s.title,
        evidence: s.evidence,
      })),
      score: project.scores[0],
      repoData: project.githubRepository,
    });

    const report = await this.prisma.researchReport.create({
      data: {
        projectId,
        summary: reportData.summary,
        confirmedFacts: reportData.confirmedFacts,
        unconfirmedClaims: reportData.unconfirmedClaims,
        risks: reportData.risks,
        detectedSignals: reportData.detectedSignals,
        suggestedResearchActions: reportData.suggestedResearchActions,
      },
    });

    return report;
  }
}
