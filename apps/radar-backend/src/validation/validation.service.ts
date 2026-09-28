import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OutcomeStatus,
  ExternalDiscoveryType,
  FirstMeaningfulSignalType,
  RejectionReason,
  ProjectStage,
  VerificationStatus,
  SignalType,
} from '@prisma/client';

export interface RecordOutcomeDto {
  status: OutcomeStatus;
  source: string;
  sourceUrl?: string;
  evidence: string;
  notes?: string;
  observedAt?: Date;
}

export interface RecordExternalDiscoveryDto {
  source: string;
  sourceUrl?: string;
  discoveryType: ExternalDiscoveryType;
  discoveredAt: Date;
  evidence: string;
}

export interface RejectProjectDto {
  rejectionReason: RejectionReason;
  notes?: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  public static readonly BASELINE_DATE = new Date('2026-09-18T23:59:59.999Z');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to compute median of numerical array or return null if empty
   */
  private calculateMedian(numbers: number[]): number | null {
    if (!numbers || numbers.length === 0) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return Math.round(sorted[mid] * 10) / 10;
    }
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }

  /**
   * Extract chronological observed signal sequence for a project
   */
  public extractSignalSequence(
    signals: { type: SignalType; detectedAt: Date; source: string }[],
  ): string[] {
    if (!signals || signals.length === 0) return [];

    const sorted = [...signals].sort(
      (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
    );
    const seen = new Set<string>();
    const sequence: string[] = [];

    for (const sig of sorted) {
      const label = sig.type.toString();
      if (!seen.has(label)) {
        seen.add(label);
        sequence.push(label);
      }
    }
    return sequence;
  }

  /**
   * Categorize source precedence from project signals and metadata
   */
  public determineSourcePrecedence(project: {
    firstXSignalAt?: Date | null;
    githubCreatedAt?: Date | null;
    firstSignalSource?: string | null;
    githubRepository?: { createdAtGithub?: Date | null } | null;
    signals?: { type: SignalType; source: string; detectedAt: Date }[];
    contracts?: { firstSeenAt?: Date }[];
  }): {
    source: 'X' | 'GITHUB' | 'BLOCKCHAIN' | 'SIMULTANEOUS' | 'UNKNOWN';
    sequenceLabel: string;
  } {
    // Determine X timestamp
    let xDate: number | null = project.firstXSignalAt
      ? new Date(project.firstXSignalAt).getTime()
      : null;
    if (!xDate && project.signals) {
      const xSig = project.signals.find((s) => s.type.toString().startsWith('X_'));
      if (xSig) xDate = new Date(xSig.detectedAt).getTime();
    }

    // Determine GitHub timestamp
    let ghDate: number | null = project.githubCreatedAt
      ? new Date(project.githubCreatedAt).getTime()
      : null;
    if (!ghDate && project.githubRepository?.createdAtGithub) {
      ghDate = new Date(project.githubRepository.createdAtGithub).getTime();
    }
    if (!ghDate && project.signals) {
      const ghSig = project.signals.find((s) => s.type.toString().startsWith('GITHUB_'));
      if (ghSig) ghDate = new Date(ghSig.detectedAt).getTime();
    }

    // Determine Blockchain / Onchain timestamp
    let onchainDate: number | null = null;
    if (project.contracts && project.contracts.length > 0 && project.contracts[0].firstSeenAt) {
      onchainDate = new Date(project.contracts[0].firstSeenAt).getTime();
    }
    if (!onchainDate && project.signals) {
      const onchainSig = project.signals.find(
        (s) =>
          s.type === SignalType.CONTRACT_DEPLOYMENT ||
          s.type === SignalType.ONCHAIN_ACTIVITY ||
          s.type === SignalType.ONCHAIN_CONTRACT_DEPLOYED,
      );
      if (onchainSig) onchainDate = new Date(onchainSig.detectedAt).getTime();
    }

    if (xDate && ghDate) {
      const diffHours = (ghDate - xDate) / (1000 * 60 * 60);
      if (Math.abs(diffHours) < 6) {
        return onchainDate
          ? { source: 'SIMULTANEOUS', sequenceLabel: 'Simultaneous (X + GitHub) → Blockchain' }
          : { source: 'SIMULTANEOUS', sequenceLabel: 'Simultaneous (X + GitHub)' };
      }
      if (xDate < ghDate) {
        return onchainDate && onchainDate > ghDate
          ? { source: 'X', sequenceLabel: 'X → GitHub → Blockchain' }
          : { source: 'X', sequenceLabel: 'X → GitHub' };
      } else {
        return onchainDate && onchainDate > xDate
          ? { source: 'GITHUB', sequenceLabel: 'GitHub → X → Blockchain' }
          : { source: 'GITHUB', sequenceLabel: 'GitHub → X' };
      }
    }

    if (xDate && !ghDate) {
      return onchainDate
        ? { source: 'X', sequenceLabel: 'X → Blockchain' }
        : { source: 'X', sequenceLabel: 'X' };
    }

    if (ghDate && !xDate) {
      return onchainDate
        ? { source: 'GITHUB', sequenceLabel: 'GitHub → Blockchain' }
        : { source: 'GITHUB', sequenceLabel: 'GitHub' };
    }

    if (onchainDate && !xDate && !ghDate) {
      return { source: 'BLOCKCHAIN', sequenceLabel: 'Blockchain' };
    }

    if (project.firstSignalSource) {
      const src = project.firstSignalSource.toUpperCase();
      if (src.includes('X') && src.includes('GITHUB'))
        return { source: 'SIMULTANEOUS', sequenceLabel: 'X + GitHub' };
      if (src.includes('X')) return { source: 'X', sequenceLabel: 'X' };
      if (src.includes('GITHUB')) return { source: 'GITHUB', sequenceLabel: 'GitHub' };
      if (src.includes('BLOCKCHAIN')) return { source: 'BLOCKCHAIN', sequenceLabel: 'Blockchain' };
    }

    return { source: 'UNKNOWN', sequenceLabel: 'Unknown' };
  }

  /**
   * GET /validation/summary
   */
  async getValidationSummary() {
    const projects = await this.prisma.project.findMany({
      include: {
        githubRepository: true,
        signals: { orderBy: { detectedAt: 'asc' } },
        contracts: true,
        scores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        outcomes: { orderBy: { observedAt: 'desc' } },
        externalDiscoveries: { orderBy: { discoveredAt: 'asc' } },
        snapshots: { orderBy: { snapshotDate: 'desc' } },
      },
      orderBy: { firstDetectedAt: 'asc' },
    });

    const now = new Date();
    const baselineThreshold = ValidationService.BASELINE_DATE;

    let baselineCount = 0;
    let newCandidates = 0;
    let freshCandidates = 0;
    let activeCandidates = 0;
    let abandonedCandidates = 0;
    let rejectedCandidates = 0;
    let externalDiscoveriesCount = 0;
    let positiveLeadTimes = 0;
    let negativeLeadTimes = 0;

    const leadTimeValues: number[] = [];
    const detectionLagValues: number[] = [];

    let activeAfter7DaysCount = 0;
    let candidatesDue7Days = 0;
    let activeAfter14DaysCount = 0;
    let candidatesDue14Days = 0;
    let activeAfter30DaysCount = 0;
    let candidatesDue30Days = 0;

    const externalDiscoveryCategoryBreakdown: Record<
      string,
      { count: number; leadTimes: number[]; medianLeadTime: number | null }
    > = {
      PROJECT_DIRECTORY: { count: 0, leadTimes: [], medianLeadTime: null },
      AIRDROP_TRACKER: { count: 0, leadTimes: [], medianLeadTime: null },
      CRYPTO_NEWS: { count: 0, leadTimes: [], medianLeadTime: null },
      MAJOR_SOCIAL_ACCOUNT: { count: 0, leadTimes: [], medianLeadTime: null },
      OFFICIAL_ANNOUNCEMENT: { count: 0, leadTimes: [], medianLeadTime: null },
      OTHER: { count: 0, leadTimes: [], medianLeadTime: null },
    };

    const firstSignalSourceDistribution: Record<string, number> = {
      X: 0,
      GITHUB: 0,
      BLOCKCHAIN: 0,
      SIMULTANEOUS: 0,
      UNKNOWN: 0,
    };

    const signalSequenceDistribution: Record<string, number> = {};
    const rejectionReasonDistribution: Record<string, number> = {
      TUTORIAL: 0,
      HOMEWORK: 0,
      FORK: 0,
      DORMANT: 0,
      DUPLICATE: 0,
      NON_WEB3: 0,
      NO_MEANINGFUL_ACTIVITY: 0,
      OTHER: 0,
    };

    const projectSummaries = projects.map((project) => {
      const isBaseline = new Date(project.firstDetectedAt) <= baselineThreshold;
      if (isBaseline) {
        baselineCount++;
      } else {
        newCandidates++;
      }

      // Detection Lag
      if (project.detectionLagDays !== null && project.detectionLagDays !== undefined) {
        detectionLagValues.push(project.detectionLagDays);
        if (project.detectionLagDays <= 30) {
          freshCandidates++;
        }
      }

      // External Discovery & Lead Times
      const externalDisc = project.externalDiscoveries[0] || null;
      if (project.externalDiscoveries && project.externalDiscoveries.length > 0) {
        externalDiscoveriesCount += project.externalDiscoveries.length;
        for (const disc of project.externalDiscoveries) {
          const cat = disc.discoveryType.toString();
          if (!externalDiscoveryCategoryBreakdown[cat]) {
            externalDiscoveryCategoryBreakdown[cat] = {
              count: 0,
              leadTimes: [],
              medianLeadTime: null,
            };
          }
          externalDiscoveryCategoryBreakdown[cat].count++;
          if (project.actualLeadTimeDays !== null && project.actualLeadTimeDays !== undefined) {
            externalDiscoveryCategoryBreakdown[cat].leadTimes.push(project.actualLeadTimeDays);
          }
        }
      } else if (project.externalDiscoveryDate) {
        externalDiscoveriesCount += 1;
      }

      if (project.actualLeadTimeDays !== null && project.actualLeadTimeDays !== undefined) {
        leadTimeValues.push(project.actualLeadTimeDays);
        if (project.actualLeadTimeDays > 0) positiveLeadTimes++;
        else if (project.actualLeadTimeDays < 0) negativeLeadTimes++;
      }

      // Status & Outcomes
      const latestOutcome = project.outcomes[0] || null;
      const isRejected =
        project.status === VerificationStatus.REJECTED || project.rejectionReason !== null;
      if (isRejected) {
        rejectedCandidates++;
        if (project.rejectionReason) {
          rejectionReasonDistribution[project.rejectionReason] =
            (rejectionReasonDistribution[project.rejectionReason] || 0) + 1;
        } else {
          rejectionReasonDistribution.OTHER++;
        }
      }

      const isAbandoned =
        latestOutcome?.status === OutcomeStatus.ABANDONED ||
        latestOutcome?.status === OutcomeStatus.NO_LONGER_ACTIVE;
      if (isAbandoned) abandonedCandidates++;

      const isActive =
        !isRejected &&
        !isAbandoned &&
        (latestOutcome?.status === OutcomeStatus.ACTIVE ||
          latestOutcome?.status === OutcomeStatus.TESTNET ||
          latestOutcome?.status === OutcomeStatus.MAINNET ||
          (project.githubRepository && project.githubRepository.recentCommits > 0) ||
          project.stage === ProjectStage.EARLY ||
          project.stage === ProjectStage.TESTNET ||
          project.stage === ProjectStage.MAINNET);
      if (isActive) activeCandidates++;

      // Retention Milestones (Days since firstRadarScanAt)
      const daysSinceDiscovery =
        (now.getTime() - new Date(project.firstRadarScanAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDiscovery >= 7) {
        candidatesDue7Days++;
        if (isActive) activeAfter7DaysCount++;
      }
      if (daysSinceDiscovery >= 14) {
        candidatesDue14Days++;
        if (isActive) activeAfter14DaysCount++;
      }
      if (daysSinceDiscovery >= 30) {
        candidatesDue30Days++;
        if (isActive) activeAfter30DaysCount++;
      }

      // Source Precedence & Sequences
      const precedence = this.determineSourcePrecedence(project);
      firstSignalSourceDistribution[precedence.source] =
        (firstSignalSourceDistribution[precedence.source] || 0) + 1;

      signalSequenceDistribution[precedence.sequenceLabel] =
        (signalSequenceDistribution[precedence.sequenceLabel] || 0) + 1;

      const sequence = this.extractSignalSequence(project.signals);

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        stage: project.stage,
        status: project.status,
        rejectionReason: project.rejectionReason,
        isBaseline,
        firstDetectedAt: project.firstDetectedAt,
        firstRadarScanAt: project.firstRadarScanAt,
        githubCreatedAt: project.githubCreatedAt,
        detectionLagDays: project.detectionLagDays,
        externalDiscoveryDate: project.externalDiscoveryDate,
        actualLeadTimeDays: project.actualLeadTimeDays,
        earlynessScore: project.earlynessScore,
        signalStrength: project.scores[0]?.totalScore || 0,
        baselineEarlynessScore: project.baselineEarlynessScore ?? project.earlynessScore,
        baselineSignalStrength:
          project.baselineSignalStrength ?? (project.scores[0]?.totalScore || 0),
        baselineDetectionLagDays: project.baselineDetectionLagDays ?? project.detectionLagDays,
        baselineStage: project.baselineStage ?? project.stage,
        verificationType: project.verificationType,
        signalDelta:
          Math.round(
            ((project.scores[0]?.totalScore || 0) -
              (project.baselineSignalStrength ?? (project.scores[0]?.totalScore || 0))) *
              10,
          ) / 10,
        earlynessDelta:
          project.earlynessScore - (project.baselineEarlynessScore ?? project.earlynessScore),
        precedenceSource: precedence.source,
        sequenceLabel: precedence.sequenceLabel,
        signalSequence: sequence,
        outcomesCount: project.outcomes.length,
        latestOutcome: latestOutcome
          ? {
              status: latestOutcome.status,
              observedAt: latestOutcome.observedAt,
              source: latestOutcome.source,
              evidence: latestOutcome.evidence,
            }
          : null,
        externalDiscoveriesCount: project.externalDiscoveries.length,
        latestExternalDiscovery: externalDisc
          ? {
              source: externalDisc.source,
              discoveryType: externalDisc.discoveryType,
              discoveredAt: externalDisc.discoveredAt,
              evidence: externalDisc.evidence,
            }
          : null,
        snapshotsCount: project.snapshots.length,
        isTutorialOrFork: project.isTutorialOrFork,
      };
    });

    const totalCandidates = projects.length;
    const falsePositiveRate =
      totalCandidates > 0 ? Math.round((rejectedCandidates / totalCandidates) * 1000) / 10 : null;

    // Calculate medians for each external discovery category
    const categoryBreakdown: Record<string, { count: number; medianLeadTime: number | null }> = {};
    for (const [cat, val] of Object.entries(externalDiscoveryCategoryBreakdown)) {
      categoryBreakdown[cat] = {
        count: val.count,
        medianLeadTime: this.calculateMedian(val.leadTimes),
      };
    }

    return {
      baselineDate: '2026-09-18',
      baselineCount,
      newCandidates,
      totalCandidates,
      freshCandidates,
      activeCandidates,
      activeAfter7Days: candidatesDue7Days > 0 ? activeAfter7DaysCount : null,
      activeAfter14Days: candidatesDue14Days > 0 ? activeAfter14DaysCount : null,
      activeAfter30Days: candidatesDue30Days > 0 ? activeAfter30DaysCount : null,
      abandonedCandidates,
      rejectedCandidates,
      externalDiscoveries: externalDiscoveriesCount,
      positiveLeadTimes,
      negativeLeadTimes,
      medianLeadTime: this.calculateMedian(leadTimeValues),
      medianDetectionLag: this.calculateMedian(detectionLagValues),
      falsePositiveRate,
      firstSignalSourceDistribution,
      signalSequenceDistribution,
      rejectionReasonDistribution,
      externalDiscoveryCategoryBreakdown: categoryBreakdown,
      candidates: projectSummaries,
    };
  }

  /**
   * Record a verified outcome with immutable evidence
   */
  async recordOutcome(projectId: string, dto: RecordOutcomeDto) {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { slug: projectId }] },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const outcome = await this.prisma.projectOutcome.create({
      data: {
        projectId: project.id,
        status: dto.status,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        evidence: dto.evidence,
        notes: dto.notes,
        observedAt: dto.observedAt ? new Date(dto.observedAt) : new Date(),
      },
    });

    // Append to timeline
    await this.prisma.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'OUTCOME_RECORDED',
        title: `Outcome Observed: ${dto.status}`,
        description: `Source: ${dto.source}. Evidence: ${dto.evidence}${dto.notes ? ` (Notes: ${dto.notes})` : ''}`,
        sourceUrl: dto.sourceUrl,
        eventDate: outcome.observedAt,
      },
    });

    // Update project stage/status if applicable
    if (dto.status === OutcomeStatus.TESTNET) {
      await this.prisma.project.update({
        where: { id: project.id },
        data: { stage: ProjectStage.TESTNET },
      });
    } else if (
      dto.status === OutcomeStatus.MAINNET ||
      dto.status === OutcomeStatus.TOKEN_LAUNCHED
    ) {
      await this.prisma.project.update({
        where: { id: project.id },
        data: { stage: ProjectStage.MAINNET },
      });
    }

    return outcome;
  }

  /**
   * Record an external discovery event and compute actual lead time
   */
  async recordExternalDiscovery(projectId: string, dto: RecordExternalDiscoveryDto) {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { slug: projectId }] },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const discoveredAt = new Date(dto.discoveredAt);
    const event = await this.prisma.externalDiscoveryEvent.create({
      data: {
        projectId: project.id,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        discoveryType: dto.discoveryType,
        discoveredAt,
        evidence: dto.evidence,
      },
    });

    // Calculate actualLeadTimeDays: (externalDiscoveryDate - firstRadarScanAt)
    const scanTime = new Date(project.firstRadarScanAt).getTime();
    const discTime = discoveredAt.getTime();
    const actualLeadTimeDays =
      Math.round(((discTime - scanTime) / (1000 * 60 * 60 * 24)) * 10) / 10;

    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        externalDiscoveryDate: discoveredAt,
        actualLeadTimeDays,
      },
    });

    // Timeline event
    const leadMessage =
      actualLeadTimeDays >= 0
        ? `Radar detected this ${actualLeadTimeDays} days before external discovery.`
        : `Radar detected this ${Math.abs(actualLeadTimeDays)} days after external discovery.`;

    await this.prisma.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'EXTERNAL_DISCOVERY_RECORDED',
        title: `External Discovery on ${dto.source} (${dto.discoveryType})`,
        description: `${leadMessage} Evidence: ${dto.evidence}`,
        sourceUrl: dto.sourceUrl,
        eventDate: discoveredAt,
      },
    });

    return { event, actualLeadTimeDays, leadMessage };
  }

  /**
   * Reject a candidate with a specific reason (Anti-False-Positive Tracking)
   */
  async rejectProject(projectId: string, dto: RejectProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { slug: projectId }] },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        status: VerificationStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
    });

    await this.prisma.projectTimelineEvent.create({
      data: {
        projectId: project.id,
        eventType: 'CANDIDATE_REJECTED',
        title: `Candidate Marked as Rejected (${dto.rejectionReason})`,
        description:
          dto.notes || `Candidate rejected during validation audit. Reason: ${dto.rejectionReason}`,
        eventDate: new Date(),
      },
    });

    return updated;
  }

  /**
   * Run daily snapshot job across all tracked candidates
   */
  async runDailySnapshotJob() {
    this.logger.log('Starting automated daily validation snapshot job...');
    const projects = await this.prisma.project.findMany({
      include: {
        githubRepository: true,
        contracts: true,
        scores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    const now = new Date();
    const createdSnapshots = [];

    for (const project of projects) {
      const repo = project.githubRepository;
      const latestScore = project.scores[0];

      const snapshot = await this.prisma.projectSnapshot.create({
        data: {
          projectId: project.id,
          snapshotDate: now,
          stage: project.stage,
          earlinessScore: project.earlynessScore,
          signalStrength: latestScore?.totalScore || 0,
          githubStars: repo?.stars || 0,
          githubForks: repo?.forks || 0,
          contributors: repo?.contributors || 0,
          recentCommits: repo?.recentCommits || 0,
          onchainActivity: latestScore?.onchainScore || 0,
          communityActivity: latestScore?.communityScore || 0,
        },
      });
      createdSnapshots.push(snapshot);
    }

    this.logger.log(`Created ${createdSnapshots.length} daily project snapshots.`);
    return { snapshotCount: createdSnapshots.length, snapshotDate: now };
  }
}
