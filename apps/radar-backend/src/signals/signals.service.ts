import { Injectable, Logger } from '@nestjs/common';
import { SignalType } from '@prisma/client';
import { GitHubRepoItem } from '../github/github.service';

export interface ExtractedSignal {
  type: SignalType;
  source: string;
  sourceUrl: string;
  title: string;
  evidence: string;
  confidence: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  extractSignalsFromGitHub(
    repo: GitHubRepoItem,
    commitCount: number,
    releasesCount: number,
  ): ExtractedSignal[] {
    const signals: ExtractedSignal[] = [];

    // 1. GITHUB_REPOSITORY_CREATED
    if (repo.created_at) {
      signals.push({
        type: SignalType.GITHUB_REPOSITORY_CREATED,
        source: 'GitHub',
        sourceUrl: repo.html_url,
        title: `Repository Created: ${repo.full_name}`,
        evidence: `Public repository initialized on GitHub at ${new Date(repo.created_at).toISOString().split('T')[0]}. Default branch: ${repo.default_branch}.`,
        confidence: 1.0,
        metadata: {
          createdAtGithub: repo.created_at,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
        },
      });
    }

    // 2. GITHUB_COMMIT_ACTIVITY
    if (commitCount > 0) {
      signals.push({
        type: SignalType.GITHUB_COMMIT_ACTIVITY,
        source: 'GitHub',
        sourceUrl: `${repo.html_url}/commits`,
        title: `Active Commit Velocity (${commitCount} recent commits)`,
        evidence: `Detected ${commitCount} commits pushed in recent activity cycles. Last push timestamp: ${repo.pushed_at}.`,
        confidence: 0.95,
        metadata: {
          recentCommits: commitCount,
          lastPushedAt: repo.pushed_at,
        },
      });
    }

    // 3. GITHUB_SMART_CONTRACT_CODE
    const isSmartContract =
      repo.language === 'Solidity' ||
      repo.language === 'Cairo' ||
      repo.topics?.includes('solidity') ||
      repo.topics?.includes('smart-contracts') ||
      repo.topics?.includes('evm');

    if (isSmartContract) {
      signals.push({
        type: SignalType.GITHUB_SMART_CONTRACT_CODE,
        source: 'GitHub Code Analysis',
        sourceUrl: repo.html_url,
        title: `Smart Contract Architecture (${repo.language || 'Solidity'})`,
        evidence: `Repository contains primary Web3 language artifacts (${repo.language}) and tagged topics (${repo.topics.join(', ')}).`,
        confidence: 0.95,
        metadata: {
          language: repo.language,
          topics: repo.topics,
        },
      });
    }

    // 4. TESTNET_REFERENCE
    const textCorpus =
      `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')}`.toLowerCase();
    if (
      textCorpus.includes('testnet') ||
      textCorpus.includes('sepolia') ||
      textCorpus.includes('devnet')
    ) {
      signals.push({
        type: SignalType.TESTNET_REFERENCE,
        source: 'Repository Metadata',
        sourceUrl: repo.html_url,
        title: 'Testnet / Devnet Reference Detected',
        evidence: `Public repository description or topics contain explicit testnet tags: "${repo.description || repo.topics.join(', ')}".`,
        confidence: 0.85,
        metadata: {
          matchedKeywords: ['testnet', 'devnet', 'sepolia'].filter((k) => textCorpus.includes(k)),
        },
      });
    }

    // 5. OFFICIAL_WEBSITE
    if (repo.homepage && repo.homepage.startsWith('http')) {
      signals.push({
        type: SignalType.OFFICIAL_WEBSITE,
        source: 'GitHub Metadata',
        sourceUrl: repo.homepage,
        title: `Official Project Portal (${repo.homepage})`,
        evidence: `Repository specifies canonical live homepage: ${repo.homepage}`,
        confidence: 0.9,
        metadata: {
          url: repo.homepage,
        },
      });
    }

    // 6. GITHUB_RELEASE
    if (releasesCount > 0) {
      signals.push({
        type: SignalType.GITHUB_RELEASE,
        source: 'GitHub Releases',
        sourceUrl: `${repo.html_url}/releases`,
        title: `Published Software Releases (${releasesCount} releases)`,
        evidence: `Project maintains formal version releases on GitHub. Total tagged releases: ${releasesCount}.`,
        confidence: 0.95,
        metadata: {
          releasesCount,
        },
      });
    }

    return signals;
  }
}
