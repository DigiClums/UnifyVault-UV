import { Injectable, Logger } from '@nestjs/common';
import { ProjectSignal, SignalType } from '@prisma/client';

export interface ScoreCalculationResult {
  developmentScore: number; // max 25
  onchainScore: number; // max 25
  communityScore: number; // max 15
  fundingScore: number; // max 15
  productScore: number; // max 10
  incentiveScore: number; // max 10
  totalScore: number; // max 100 (Signal Strength)
  earlynessScore: number; // 0 - 100 (Earlyness metric)
  detectionLagDays: number | null;
  whyDetected: string[];
  whyNotDetected: string[];
  isTutorialOrFork: boolean;
  explanations: {
    development: string[];
    onchain: string[];
    community: string[];
    funding: string[];
    product: string[];
    incentive: string[];
    penalties: string[];
  };
}

export interface ProjectScoreInput {
  name?: string;
  description?: string | null;
  repo?: {
    stars: number;
    forks: number;
    contributors: number;
    recentCommits: number;
    language: string | null;
    topics: string[];
    createdAtGithub?: Date | null;
  } | null;
  contracts?: Array<{
    chain: string;
    verified: boolean;
  }>;
  signals?: Array<ProjectSignal>;
  websiteUrl?: string | null;
  docsUrl?: string | null;
  xUrl?: string | null;
  discordUrl?: string | null;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  // Anti-False-Positive Filter for Tutorials, Courseworks, and Dormant Repos
  detectTutorialOrFork(input: ProjectScoreInput): { isTutorial: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const text =
      `${input.name || ''} ${input.description || ''} ${input.repo?.topics?.join(' ') || ''}`.toLowerCase();

    const tutorialKeywords = [
      'tutorial',
      'freecodecamp',
      'homework',
      'assignment',
      'course',
      'learn solidity',
      'bootcamp',
      'crypto-zombies',
      'fcc',
      'practice repo',
      'study notes',
      'my first smart contract',
      'solidity-by-example',
      'sample project',
    ];
    for (const kw of tutorialKeywords) {
      if (text.includes(kw)) {
        reasons.push(`Tutorial / Coursework signature detected: "${kw}"`);
      }
    }

    if (input.repo?.createdAtGithub) {
      const ageInDays =
        (Date.now() - new Date(input.repo.createdAtGithub).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 365 && input.repo.recentCommits === 0) {
        reasons.push(
          `Stale/Dormant codebase: Created ${Math.round(ageInDays)} days ago with 0 recent commits`,
        );
      }
    }

    return {
      isTutorial: reasons.length > 0,
      reasons,
    };
  }

  // Calculate Earlyness (0-100) based strictly on age since GitHub genesis
  calculateEarlyness(createdAtGithub?: Date | null): {
    earlynessScore: number;
    lagDays: number | null;
    ageLabel: string;
  } {
    if (!createdAtGithub) {
      return { earlynessScore: 50, lagDays: null, ageLabel: 'Unknown Age' };
    }

    const lagDays = Math.max(
      0,
      (Date.now() - new Date(createdAtGithub).getTime()) / (1000 * 60 * 60 * 24),
    );
    let score = 0;
    let label = '';

    if (lagDays <= 14) {
      score = 95 - Math.round((lagDays / 14) * 10); // 85 - 95 (Hyper Fresh)
      label = `Ultra Fresh (${Math.round(lagDays)} days old)`;
    } else if (lagDays <= 30) {
      score = 85 - Math.round(((lagDays - 14) / 16) * 15); // 70 - 85 (0-30 days)
      label = `Fresh (<30 days)`;
    } else if (lagDays <= 90) {
      score = 70 - Math.round(((lagDays - 30) / 60) * 25); // 45 - 70 (31-90 days)
      label = `Early (31-90 days)`;
    } else if (lagDays <= 180) {
      score = 45 - Math.round(((lagDays - 90) / 90) * 20); // 25 - 45 (91-180 days)
      label = `Maturing (91-180 days)`;
    } else {
      score = Math.max(5, 25 - Math.round(((lagDays - 180) / 365) * 20)); // 5 - 25 (180+ days)
      label = `Established (>180 days)`;
    }

    return { earlynessScore: score, lagDays, ageLabel: label };
  }

  calculateScore(input: ProjectScoreInput): ScoreCalculationResult {
    let dev = 0;
    let onchain = 0;
    let comm = 0;
    let funding = 0;
    let product = 0;
    let incentive = 0;

    const whyDetected: string[] = [];
    const whyNotDetected: string[] = [];

    const explanations = {
      development: [] as string[],
      onchain: [] as string[],
      community: [] as string[],
      funding: [] as string[],
      product: [] as string[],
      incentive: [] as string[],
      penalties: [] as string[],
    };

    // Calculate Earlyness & Detection Lag
    const earlyness = this.calculateEarlyness(input.repo?.createdAtGithub);
    if (earlyness.lagDays !== null) {
      whyDetected.push(
        `Repository created ${Math.round(earlyness.lagDays)} days ago (${earlyness.ageLabel})`,
      );
    }

    // Run Anti-False-Positive check
    const falsePositive = this.detectTutorialOrFork(input);
    const isTutorialOrFork = falsePositive.isTutorial;

    // 1. Development Scoring (Max 25)
    if (input.repo) {
      if (
        input.repo.language === 'Solidity' ||
        input.repo.language === 'Rust' ||
        input.repo.language === 'Cairo'
      ) {
        dev += 8;
        explanations.development.push(
          `Core Web3 / smart contract codebase (${input.repo.language}) detected (+8)`,
        );
        whyDetected.push(`Smart contract codebase (${input.repo.language}) detected`);
      } else if (input.repo.language) {
        dev += 4;
        explanations.development.push(`Active codebase in ${input.repo.language} (+4)`);
      }

      if (input.repo.recentCommits > 20) {
        dev += 7;
        explanations.development.push(`High commit velocity (>20 commits recently) (+7)`);
        whyDetected.push(`High commit velocity (${input.repo.recentCommits} recent commits)`);
      } else if (input.repo.recentCommits > 0) {
        dev += 4;
        explanations.development.push(`Active development commits detected (+4)`);
        whyDetected.push(`${input.repo.recentCommits} recent commits pushed`);
      }

      if (input.repo.contributors > 1) {
        dev += 5;
        explanations.development.push(
          `Multiple active contributors (${input.repo.contributors}) (+5)`,
        );
        whyDetected.push(`${input.repo.contributors} active contributors`);
      }

      const hasSoliditySignal = input.signals?.some(
        (s) => s.type === SignalType.GITHUB_SMART_CONTRACT_CODE,
      );
      if (
        hasSoliditySignal &&
        !explanations.development.some((e) => e.includes('smart contract'))
      ) {
        dev += 5;
        explanations.development.push(`Smart contract code verification detected (+5)`);
      }
    } else {
      explanations.development.push('No linked GitHub repository data available (0/25)');
    }
    dev = Math.min(25, dev);

    // 2. On-Chain Scoring (Max 25)
    if (input.contracts && input.contracts.length > 0) {
      onchain += 10;
      explanations.onchain.push(
        `Deployed on-chain contract(s) detected (${input.contracts.length} address[es]) (+10)`,
      );
      whyDetected.push(`On-chain contracts deployed (${input.contracts.length} addresses)`);
      const hasVerified = input.contracts.some((c) => c.verified);
      if (hasVerified) {
        onchain += 8;
        explanations.onchain.push(`Verified bytecode / ABI on block explorer (+8)`);
      }
    }

    const hasTestnetSignal = input.signals?.some(
      (s) => s.type === SignalType.TESTNET_REFERENCE || s.type === SignalType.DEVNET_REFERENCE,
    );
    if (hasTestnetSignal) {
      onchain += 7;
      explanations.onchain.push(`Testnet / Devnet activity references detected (+7)`);
      whyDetected.push(`Testnet / devnet environment references found`);
    }

    const hasOnchainActivity = input.signals?.some((s) => s.type === SignalType.ONCHAIN_ACTIVITY);
    if (hasOnchainActivity) {
      onchain += 5;
      explanations.onchain.push(`Live on-chain interactions detected (+5)`);
      whyDetected.push(`Live on-chain activity detected`);
    }
    if (onchain === 0) {
      explanations.onchain.push('No live on-chain deployments or testnet telemetry found (0/25)');
    }
    onchain = Math.min(25, onchain);

    // 3. Community Scoring (Max 15)
    if (input.discordUrl) {
      comm += 4;
      explanations.community.push(`Official Discord server link detected (+4)`);
    }
    if (input.xUrl) {
      comm += 4;
      explanations.community.push(`Official X / Twitter profile detected (+4)`);
    }
    if (input.repo && input.repo.stars > 10) {
      comm += 4;
      explanations.community.push(`Developer stargazers (${input.repo.stars} stars) (+4)`);
    }
    comm = Math.min(15, comm);

    // 4. Funding Scoring (Max 15)
    const fundingSignals = input.signals?.filter((s) => s.type === SignalType.FUNDING_EVENT) || [];
    if (fundingSignals.length > 0) {
      funding += 15;
      explanations.funding.push(`Public institutional funding / grant event detected (+15)`);
      whyDetected.push(`Verified institutional funding / grant detected`);
    } else {
      explanations.funding.push(
        'No verified venture capital, seed round, or ecosystem grant recorded yet (0/15)',
      );
      whyNotDetected.push('No venture capital funding or grant announcement');
    }
    funding = Math.min(15, funding);

    // 5. Product Scoring (Max 10)
    if (input.websiteUrl) {
      product += 5;
      explanations.product.push(`Official live website / portal detected (+5)`);
      whyDetected.push(`Live portal accessible`);
    } else {
      whyNotDetected.push('No public website portal detected');
    }
    if (input.docsUrl) {
      product += 5;
      explanations.product.push(`Technical documentation portal detected (+5)`);
      whyDetected.push(`Documentation portal detected`);
    }
    product = Math.min(10, product);

    // 6. Incentive Scoring (Max 10)
    const hasPoints = input.signals?.some(
      (s) => s.type === SignalType.POINTS_PROGRAM || s.type === SignalType.QUEST_PROGRAM,
    );
    const hasToken = input.signals?.some(
      (s) => s.type === SignalType.TOKEN_ANNOUNCEMENT || s.type === SignalType.AIRDROP_ANNOUNCEMENT,
    );

    if (hasPoints) {
      incentive += 6;
      explanations.incentive.push(`Public points system or testnet quest program detected (+6)`);
      whyDetected.push(`Points or quest program detected`);
    } else {
      whyNotDetected.push('No points system or quest program announced');
    }
    if (hasToken) {
      incentive += 4;
      explanations.incentive.push(`Token / incentive documentation detected (+4)`);
      whyDetected.push(`Tokenomics documentation detected`);
    } else {
      whyNotDetected.push('No official token / airdrop announcement');
    }
    incentive = Math.min(10, incentive);

    let total = dev + onchain + comm + funding + product + incentive;

    if (isTutorialOrFork) {
      for (const r of falsePositive.reasons) {
        explanations.penalties.push(`[FALSE-POSITIVE PENALTY] ${r}`);
      }
      total = Math.round(total * 0.2);
      explanations.penalties.push(
        `Signal Strength capped to ${total}/100 due to tutorial/dormant footprint.`,
      );
    }

    return {
      developmentScore: dev,
      onchainScore: onchain,
      communityScore: comm,
      fundingScore: funding,
      productScore: product,
      incentiveScore: incentive,
      totalScore: total,
      earlynessScore: earlyness.earlynessScore,
      detectionLagDays: earlyness.lagDays,
      whyDetected,
      whyNotDetected,
      isTutorialOrFork,
      explanations,
    };
  }
}
