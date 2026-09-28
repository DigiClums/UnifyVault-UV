import { Injectable, Logger } from '@nestjs/common';
import { ProjectStage, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubService, GitHubRepoItem } from '../github/github.service';
import { SignalsService } from '../signals/signals.service';
import { ScoringService } from '../scoring/scoring.service';
import { ResearchService } from '../research/research.service';

export interface CorrelatedDiscoveryItem {
  id: string;
  projectId: string;
  projectName: string;
  slug: string;
  source: string;
  collectionMode: 'AUTOMATED' | 'MANUAL' | 'CORROBORATED';
  sourceUrl: string | null;
  sourceTimestamp: Date | null;
  observedAt: Date;
  technicalArtifact: {
    hasGithub: boolean;
    hasContract: boolean;
    hasDocs: boolean;
    technicalMatches: string[];
  };
  xCorroboration: boolean;
  githubCorroboration: boolean;
  contractCorroboration: boolean;
  stage: ProjectStage;
  status: VerificationStatus;
  cohort: 'COHORT_A_FROZEN' | 'COHORT_B_OBSERVATIONAL';
}

export interface DiscoveryResult {
  discoveredCount: number;
  newProjectsCount: number;
  updatedProjectsCount: number;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    score: number;
    stage: string;
  }>;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GitHubService,
    private readonly signalsService: SignalsService,
    private readonly scoringService: ScoringService,
    private readonly researchService: ResearchService,
  ) {}

  /**
   * Filter and validate technical keywords against noise and engagement farming
   */
  filterTechnicalKeywords(text: string): {
    isTechnical: boolean;
    matches: string[];
    hasFarming: boolean;
  } {
    const lower = text.toLowerCase();
    const technicalAnchors = [
      'erc',
      'eip',
      'avs',
      'zkvm',
      'zkevm',
      'rollup',
      'coprocessor',
      'verifier',
      'paymaster',
      'bundler',
      'smart contract',
      'sdk',
      'rpc',
      'testnet',
      'devnet',
      'deploy',
      'contract address',
      'explorer',
      'rfc',
      'solidity',
      'vyper',
      'rust sdk',
      'layerzero',
      'chainlink',
    ];
    const farmingKeywords = ['airdrop', 'giveaway', '100x', 'bull', 'free token', 'tag 3 friends'];

    const matches = technicalAnchors.filter((anchor) => lower.includes(anchor));
    const hasFarming = farmingKeywords.some((fk) => lower.includes(fk));
    const isTechnical = matches.length > 0 && !hasFarming;

    return { isTechnical, matches, hasFarming };
  }

  /**
   * Returns correlated multi-source discovery feed across GitHub, X (Manual), and On-Chain
   */
  async getCorrelatedDiscoveryFeed(options?: {
    limit?: number;
  }): Promise<CorrelatedDiscoveryItem[]> {
    const limit = options?.limit || 50;
    const projects = await this.prisma.project.findMany({
      include: {
        signals: { orderBy: { detectedAt: 'desc' } },
        githubRepository: true,
        contracts: true,
      },
      orderBy: { firstDetectedAt: 'desc' },
      take: limit,
    });

    return projects.map((p) => {
      const hasX = p.signals.some((s) => s.source === 'X');
      const hasManualX = p.signals.some(
        (s) => s.source === 'X' && (s.metadata as any)?.collectionMode === 'MANUAL',
      );
      const hasGithub = Boolean(
        p.githubRepository || p.signals.some((s) => s.source.toLowerCase().includes('github')),
      );
      const hasContract = Boolean(
        p.contracts.length > 0 ||
        p.signals.some(
          (s) =>
            s.type === 'CONTRACT_DEPLOYMENT' ||
            s.type === 'GITHUB_SMART_CONTRACT_CODE' ||
            s.type === 'ONCHAIN_CONTRACT_DEPLOYED',
        ),
      );
      const hasDocs = Boolean(p.docsUrl || p.websiteUrl);

      const combinedText = `${p.name} ${p.description || ''} ${p.signals.map((s) => s.title + ' ' + s.evidence).join(' ')}`;
      const techEval = this.filterTechnicalKeywords(combinedText);

      let collectionMode: 'AUTOMATED' | 'MANUAL' | 'CORROBORATED' = 'AUTOMATED';
      if (hasX && hasGithub) {
        collectionMode = 'CORROBORATED';
      } else if (hasManualX) {
        collectionMode = 'MANUAL';
      }

      const primarySource = p.firstSignalSource || (hasGithub ? 'GITHUB' : hasX ? 'X' : 'SYSTEM');

      return {
        id: p.id,
        projectId: p.id,
        projectName: p.name,
        slug: p.slug,
        source: primarySource,
        collectionMode,
        sourceUrl: p.githubUrl || p.xUrl || p.websiteUrl,
        sourceTimestamp: p.githubCreatedAt || p.firstXSignalAt || p.firstDetectedAt,
        observedAt: p.firstRadarScanAt || p.firstDetectedAt,
        technicalArtifact: {
          hasGithub,
          hasContract,
          hasDocs,
          technicalMatches: techEval.matches,
        },
        xCorroboration: hasX,
        githubCorroboration: hasGithub,
        contractCorroboration: hasContract,
        stage: p.stage,
        status: p.status,
        cohort: p.baselineEarlynessScore !== null ? 'COHORT_A_FROZEN' : 'COHORT_B_OBSERVATIONAL',
      };
    });
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async runGitHubDiscovery(options?: { query?: string; limit?: number }): Promise<DiscoveryResult> {
    const query = options?.query || 'solidity testnet language:solidity';
    const limit = options?.limit || 10;

    this.logger.log(`Starting GitHub Discovery with query: "${query}", limit: ${limit}`);
    const repos = await this.githubService.searchRepositories(query, 'updated', limit);

    let newCount = 0;
    let updatedCount = 0;
    const resultProjects: Array<{
      id: string;
      name: string;
      slug: string;
      score: number;
      stage: string;
    }> = [];

    for (const repo of repos) {
      try {
        const project = await this.processDiscoveredRepo(repo);
        if (project.isNew) newCount++;
        else updatedCount++;

        resultProjects.push({
          id: project.id,
          name: project.name,
          slug: project.slug,
          score: project.score,
          stage: project.stage,
        });
      } catch (err: any) {
        this.logger.error(`Error processing repo ${repo.full_name}: ${err.message}`);
      }
    }

    return {
      discoveredCount: repos.length,
      newProjectsCount: newCount,
      updatedProjectsCount: updatedCount,
      projects: resultProjects,
    };
  }

  async processDiscoveredRepo(repo: GitHubRepoItem): Promise<{
    id: string;
    name: string;
    slug: string;
    score: number;
    stage: string;
    isNew: boolean;
  }> {
    const owner = repo.owner.login;
    const repoName = repo.name;
    const repoUrl = repo.html_url;

    // Deduplication check: by githubUrl or slug
    const initialSlug = this.generateSlug(repoName);
    const existingProject = await this.prisma.project.findFirst({
      where: {
        OR: [{ githubUrl: repoUrl }, { slug: initialSlug }],
      },
      include: {
        githubRepository: true,
        signals: true,
        scores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    const isNew = !existingProject;
    let projectId: string;
    let slug = initialSlug;

    // Fetch live supplementary GitHub metadata
    const recentCommits = await this.githubService.getRecentCommitsCount(owner, repoName, 30);
    const contributors = await this.githubService.getContributorsCount(owner, repoName);
    const releasesCount = await this.githubService.getReleasesCount(owner, repoName);

    // Determine initial stage based on signals
    let stage: ProjectStage = ProjectStage.DISCOVERED;
    const textCorpus =
      `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();
    if (
      textCorpus.includes('testnet') ||
      textCorpus.includes('sepolia') ||
      textCorpus.includes('devnet')
    ) {
      stage = ProjectStage.TESTNET;
    } else if (recentCommits > 10 || repo.language === 'Solidity') {
      stage = ProjectStage.EARLY;
    }

    if (!existingProject) {
      // Ensure slug uniqueness
      let slugCandidate = slug;
      let counter = 1;
      while (await this.prisma.project.findUnique({ where: { slug: slugCandidate } })) {
        slugCandidate = `${slug}-${counter}`;
        counter++;
      }
      slug = slugCandidate;

      const githubCreatedAt = repo.created_at ? new Date(repo.created_at) : null;
      const firstRadarScanAt = new Date();
      const detectionLagDays = githubCreatedAt
        ? Math.max(
            0,
            (firstRadarScanAt.getTime() - githubCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;

      const created = await this.prisma.project.create({
        data: {
          name: repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          slug,
          description: repo.description,
          githubUrl: repoUrl,
          websiteUrl: repo.homepage || null,
          docsUrl: repo.homepage?.includes('docs') ? repo.homepage : null,
          stage,
          status: VerificationStatus.UNVERIFIED,
          firstDetectedAt: firstRadarScanAt,
          firstRadarScanAt: firstRadarScanAt,
          githubCreatedAt: githubCreatedAt,
          detectionLagDays: detectionLagDays,
          lastCheckedAt: new Date(),
          githubRepository: {
            create: {
              repositoryUrl: repoUrl,
              owner,
              repository: repoName,
              createdAtGithub: githubCreatedAt,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              contributors,
              recentCommits,
              lastCommitAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
              language: repo.language,
              topics: repo.topics || [],
            },
          },
          timelineEvents: {
            create: {
              eventType: 'FIRST_DETECTED',
              title: `Discovered on GitHub by UnifyVault Early Radar`,
              description: `Initial repository discovery for ${repo.full_name}. GitHub genesis: ${githubCreatedAt ? githubCreatedAt.toISOString().split('T')[0] : 'N/A'}. Stars: ${repo.stargazers_count}, Language: ${repo.language || 'N/A'}.`,
              sourceUrl: repoUrl,
              eventDate: firstRadarScanAt,
            },
          },
        },
      });
      projectId = created.id;
    } else {
      projectId = existingProject.id;
      slug = existingProject.slug;

      // Update repo & lastCheckedAt
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          lastCheckedAt: new Date(),
          description: repo.description || existingProject.description,
          websiteUrl: repo.homepage || existingProject.websiteUrl,
        },
      });

      await this.prisma.gitHubRepository.upsert({
        where: { projectId },
        create: {
          projectId,
          repositoryUrl: repoUrl,
          owner,
          repository: repoName,
          createdAtGithub: repo.created_at ? new Date(repo.created_at) : null,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          contributors,
          recentCommits,
          lastCommitAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          language: repo.language,
          topics: repo.topics || [],
        },
        update: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          contributors,
          recentCommits,
          lastCommitAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          language: repo.language,
          topics: repo.topics || [],
        },
      });
    }

    // Extract and persist signals
    const extractedSignals = this.signalsService.extractSignalsFromGitHub(
      repo,
      recentCommits,
      releasesCount,
    );
    for (const sig of extractedSignals) {
      const existingSignal = await this.prisma.projectSignal.findFirst({
        where: {
          projectId,
          type: sig.type,
          title: sig.title,
        },
      });

      if (!existingSignal) {
        await this.prisma.projectSignal.create({
          data: {
            projectId,
            type: sig.type,
            source: sig.source,
            sourceUrl: sig.sourceUrl,
            title: sig.title,
            evidence: sig.evidence,
            confidence: sig.confidence,
            metadata: sig.metadata,
          },
        });
      }
    }

    // Recalculate score
    const updatedSignals = await this.prisma.projectSignal.findMany({ where: { projectId } });
    const scoreResult = this.scoringService.calculateScore({
      name: repo.name,
      description: repo.description,
      repo: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        contributors,
        recentCommits,
        language: repo.language,
        topics: repo.topics || [],
        createdAtGithub: repo.created_at ? new Date(repo.created_at) : null,
      },
      signals: updatedSignals,
      websiteUrl: repo.homepage,
      docsUrl: repo.homepage?.includes('docs') ? repo.homepage : null,
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        isTutorialOrFork: scoreResult.isTutorialOrFork,
        earlynessScore: scoreResult.earlynessScore,
        detectionLagDays: scoreResult.detectionLagDays,
        whyDetected: scoreResult.whyDetected,
        whyNotDetected: scoreResult.whyNotDetected,
      },
    });

    await this.prisma.scoreSnapshot.create({
      data: {
        projectId,
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

    // Auto-generate initial research report if none exists
    const existingReports = await this.prisma.researchReport.count({ where: { projectId } });
    if (existingReports === 0) {
      await this.researchService.generateReportForProject(projectId);
    }

    const finalProject = await this.prisma.project.findUnique({ where: { id: projectId } });

    return {
      id: projectId,
      name: finalProject?.name || repo.name,
      slug,
      score: scoreResult.totalScore,
      stage: finalProject?.stage || stage,
      isNew,
    };
  }
}
