import { ScoringService } from './scoring.service';
import { SignalType } from '@prisma/client';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  it('should calculate transparent score for an active Solidity project', () => {
    const result = scoringService.calculateScore({
      repo: {
        stars: 120,
        forks: 30,
        contributors: 6,
        recentCommits: 25,
        language: 'Solidity',
        topics: ['solidity', 'testnet', 'ethereum'],
      },
      signals: [
        {
          id: 'sig-1',
          projectId: 'proj-1',
          type: SignalType.GITHUB_SMART_CONTRACT_CODE,
          source: 'GitHub',
          sourceUrl: 'https://github.com/test/repo',
          title: 'Smart contract code',
          evidence: 'Solidity files found',
          confidence: 0.95,
          detectedAt: new Date(),
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 'sig-2',
          projectId: 'proj-1',
          type: SignalType.TESTNET_REFERENCE,
          source: 'GitHub',
          sourceUrl: 'https://github.com/test/repo',
          title: 'Testnet mentioned',
          evidence: 'Sepolia deployment docs',
          confidence: 0.9,
          detectedAt: new Date(),
          metadata: null,
          createdAt: new Date(),
        },
      ],
      websiteUrl: 'https://testproject.xyz',
      docsUrl: 'https://docs.testproject.xyz',
      xUrl: 'https://x.com/testproject',
      discordUrl: 'https://discord.gg/testproject',
    });

    expect(result.developmentScore).toBeGreaterThanOrEqual(15);
    expect(result.developmentScore).toBeLessThanOrEqual(25);
    expect(result.onchainScore).toBeGreaterThanOrEqual(7);
    expect(result.communityScore).toBeGreaterThanOrEqual(10);
    expect(result.productScore).toBe(10); // website(5) + docs(5)
    expect(result.totalScore).toBeGreaterThanOrEqual(40);
    expect(result.explanations.development.length).toBeGreaterThan(0);
  });

  it('should explain 0 score when no data is provided', () => {
    const result = scoringService.calculateScore({});
    expect(result.totalScore).toBe(0);
    expect(result.explanations.development).toContain(
      'No linked GitHub repository data available (0/25)',
    );
    expect(result.explanations.onchain).toContain(
      'No live on-chain deployments or testnet telemetry found (0/25)',
    );
  });
});
