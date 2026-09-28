import { DiscoveryService } from './discovery.service';
import { ProjectStage, VerificationStatus } from '@prisma/client';

describe('DiscoveryService (Zero-Cost Discovery & Technical Filters)', () => {
  let service: DiscoveryService;
  let mockPrisma: any;
  let mockGithubService: any;
  let mockSignalsService: any;
  let mockScoringService: any;
  let mockResearchService: any;

  beforeEach(() => {
    mockPrisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectSignal: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      gitHubRepository: {
        upsert: jest.fn(),
      },
      scoreSnapshot: {
        create: jest.fn(),
      },
      researchReport: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    mockGithubService = {
      searchRepositories: jest.fn(),
      getRecentCommitsCount: jest.fn(),
      getContributorsCount: jest.fn(),
      getReleasesCount: jest.fn(),
    };

    mockSignalsService = {
      extractSignalsFromGitHub: jest.fn().mockReturnValue([]),
    };

    mockScoringService = {
      calculateScore: jest.fn().mockReturnValue({
        totalScore: 75,
        earlynessScore: 80,
        isTutorialOrFork: false,
        whyDetected: ['Active smart contract development'],
        whyNotDetected: [],
      }),
    };

    mockResearchService = {
      generateReportForProject: jest.fn(),
    };

    service = new DiscoveryService(
      mockPrisma,
      mockGithubService,
      mockSignalsService,
      mockScoringService,
      mockResearchService,
    );
  });

  describe('Technical Signal Keyword Filtering', () => {
    it('should identify legitimate technical Web3 anchors', () => {
      const text =
        'Modular zkVM coprocessor smart contract with ERC-4337 paymaster SDK on Sepolia testnet';
      const result = service.filterTechnicalKeywords(text);

      expect(result.isTechnical).toBe(true);
      expect(result.matches).toContain('zkvm');
      expect(result.matches).toContain('coprocessor');
      expect(result.matches).toContain('erc');
      expect(result.matches).toContain('paymaster');
      expect(result.matches).toContain('testnet');
      expect(result.hasFarming).toBe(false);
    });

    it('should flag engagement farming keywords as non-technical / noise', () => {
      const text = '100x bull token airdrop giveaway! Drop address and tag 3 friends!';
      const result = service.filterTechnicalKeywords(text);

      expect(result.hasFarming).toBe(true);
      expect(result.isTechnical).toBe(false);
    });
  });

  describe('Correlated Discovery Feed', () => {
    it('should correctly attribute AUTOMATED, MANUAL, and CORROBORATED collection modes', async () => {
      const mockProjects = [
        {
          id: 'proj_corroborated_1',
          name: 'Untoll Hook',
          slug: 'untoll-hook',
          githubUrl: 'https://github.com/example/untoll',
          xUrl: 'https://x.com/untoll',
          websiteUrl: 'https://untoll.xyz',
          stage: ProjectStage.TESTNET,
          status: VerificationStatus.VERIFIED,
          firstDetectedAt: new Date('2026-08-25T10:00:00Z'),
          firstRadarScanAt: new Date('2026-09-18T10:00:00Z'),
          githubCreatedAt: new Date('2026-08-28T10:00:00Z'),
          firstXSignalAt: new Date('2026-08-25T10:00:00Z'),
          firstSignalSource: 'X + GitHub',
          baselineEarlynessScore: 70, // Cohort A Frozen
          githubRepository: { id: 'repo_1' },
          contracts: [{ id: 'contract_1' }],
          signals: [
            {
              source: 'GitHub',
              title: 'Smart Contract',
              evidence: 'Solidity hook',
              detectedAt: new Date(),
            },
            {
              source: 'X',
              title: 'X Founder Mention',
              evidence: 'Manual tweet',
              detectedAt: new Date(),
              metadata: { collectionMode: 'MANUAL' },
            },
          ],
        },
        {
          id: 'proj_manual_only_2',
          name: 'Bouquet',
          slug: 'bouquet',
          xUrl: 'https://x.com/bouquet',
          stage: ProjectStage.DISCOVERED,
          status: VerificationStatus.UNVERIFIED,
          firstDetectedAt: new Date('2026-09-18T10:00:00Z'),
          firstRadarScanAt: new Date('2026-09-18T10:00:00Z'),
          githubCreatedAt: null,
          firstXSignalAt: new Date('2026-09-18T10:00:00Z'),
          firstSignalSource: 'X (Manual)',
          baselineEarlynessScore: null, // Cohort B Observational
          githubRepository: null,
          contracts: [],
          signals: [
            {
              source: 'X',
              title: 'X Building',
              evidence: 'Manual post',
              detectedAt: new Date(),
              metadata: { collectionMode: 'MANUAL' },
            },
          ],
        },
      ];

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const feed = await service.getCorrelatedDiscoveryFeed({ limit: 10 });

      expect(feed.length).toBe(2);

      // Project 1: Has both X + GitHub -> CORROBORATED
      expect(feed[0].collectionMode).toBe('CORROBORATED');
      expect(feed[0].xCorroboration).toBe(true);
      expect(feed[0].githubCorroboration).toBe(true);
      expect(feed[0].contractCorroboration).toBe(true);
      expect(feed[0].cohort).toBe('COHORT_A_FROZEN');

      // Project 2: Has only manual X -> MANUAL
      expect(feed[1].collectionMode).toBe('MANUAL');
      expect(feed[1].xCorroboration).toBe(true);
      expect(feed[1].githubCorroboration).toBe(false);
      expect(feed[1].cohort).toBe('COHORT_B_OBSERVATIONAL');
    });
  });
});
