import { InvestigationService } from './investigation.service';
import { EntityType, ProjectStage } from '@prisma/client';
import { RepoRelationship } from './investigation.types';

describe('InvestigationService (Zero-Cost Deep Entity Investigation)', () => {
  let service: InvestigationService;
  let mockPrisma: any;
  let mockGithubService: any;

  beforeEach(() => {
    mockPrisma = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectSignal: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockGithubService = {
      getRepository: jest.fn(),
      getRecentCommitsCount: jest.fn(),
      getContributorsCount: jest.fn(),
      getReleasesCount: jest.fn(),
    };

    service = new InvestigationService(mockPrisma, mockGithubService);
  });

  describe('1. Entity Classification & Vitalik / KOL Tests', () => {
    it('Scenario 1 & 15: Vitalik-style KOL/Researcher post remains PERSON, not PROJECT', () => {
      const name = 'Vitalik Buterin';
      const bio = 'Ethereum researcher, writer, builder';
      const text = 'ERC-4337 and account abstraction paymasters represent the future of EVM UX.';

      const res = service.classifyEntity(name, bio, text);

      expect(res.entityType).toBe(EntityType.PERSON);
      expect(res.isPersonOrKOL).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('Scenario 2: Actual project / protocol account is classified as PROTOCOL/PROJECT', () => {
      const name = 'Untoll Protocol';
      const bio = 'Decentralized hook rollup for cross-chain liquidity';
      const text = 'Announcing our new testnet live on Sepolia';

      const res = service.classifyEntity(name, bio, text);

      expect(res.entityType).toBe(EntityType.PROTOCOL);
      expect(res.isPersonOrKOL).toBe(false);
    });

    it('Scenario 3: X person mentioning a GitHub repo links the repo as referenced target', () => {
      const name = 'Vitalik Buterin';
      const bio = 'Ethereum researcher';
      const text =
        'Check out this new open source ERC-4337 bundler implementation: https://github.com/pimlicolabs/alto';

      const res = service.classifyEntity(name, bio, text);

      expect(res.entityType).toBe(EntityType.PERSON);
      expect(res.isPersonOrKOL).toBe(true);
      expect(res.referencedTarget).toBeDefined();
      expect(res.referencedTarget?.type).toBe('GITHUB');
      expect(res.referencedTarget?.value).toBe('https://github.com/pimlicolabs/alto');
    });
  });

  describe('2. Multi-Source Corroboration Graph', () => {
    it('Scenario 4: X + GitHub produces CORROBORATED mode', async () => {
      mockGithubService.getRepository.mockResolvedValue({
        name: 'alto',
        language: 'TypeScript',
        description: 'ERC-4337 bundler',
        topics: ['erc-4337', 'bundler'],
        created_at: '2026-01-01T00:00:00Z',
        fork: false,
      });
      mockGithubService.getRecentCommitsCount.mockResolvedValue(15);
      mockGithubService.getContributorsCount.mockResolvedValue(4);
      mockGithubService.getReleasesCount.mockResolvedValue(3);

      const report = await service.investigateEntity({
        xUrl: 'https://x.com/pimlicoHQ/status/123456',
        githubUrl: 'https://github.com/pimlicolabs/alto',
        authorName: 'Pimlico',
        authorUsername: 'pimlicoHQ',
      });

      expect(report.crossSourceCorroboration.mode).toBe('CORROBORATED');
      expect(report.crossSourceCorroboration.nodes.some((n) => n.source === 'X')).toBe(true);
      expect(report.crossSourceCorroboration.nodes.some((n) => n.source === 'GITHUB')).toBe(true);
    });

    it('Scenario 5: X + GitHub + Contract produces MULTI_SOURCE_CORROBORATED mode', async () => {
      mockGithubService.getRepository.mockResolvedValue({
        name: 'ccip-vault',
        language: 'Solidity',
        description: 'Smart contracts for CCIP vault',
        topics: ['solidity', 'smart-contracts'],
        created_at: '2026-01-01T00:00:00Z',
        fork: false,
      });
      mockGithubService.getRecentCommitsCount.mockResolvedValue(10);
      mockGithubService.getContributorsCount.mockResolvedValue(2);
      mockGithubService.getReleasesCount.mockResolvedValue(1);

      const report = await service.investigateEntity({
        xUrl: 'https://x.com/SonicWizard/status/789101',
        githubUrl: 'https://github.com/SonicWizard/ccip-vault-for-zksync',
        textSnippet:
          'Deployed verified vault at 0x1234567890123456789012345678901234567890 on Sepolia',
        authorName: 'SonicWizard',
      });

      expect(report.crossSourceCorroboration.mode).toBe('MULTI_SOURCE_CORROBORATED');
      expect(report.onChainAnalysis.contractAddresses).toContain(
        '0x1234567890123456789012345678901234567890',
      );
      expect(report.onChainAnalysis.status).toBe('BYTECODE_DETECTED');
    });
  });

  describe('3. On-Chain, Funding & Incentive Evidence Guardrails', () => {
    it('Scenario 7: Missing on-chain evidence remains score = 0 and ON_CHAIN_EVIDENCE_NOT_FOUND without scam penalty', () => {
      const onChain = service.inspectOnChain([]);
      expect(onChain.onChainEvidenceScore).toBe(0);
      expect(onChain.status).toBe('ON_CHAIN_EVIDENCE_NOT_FOUND');
      expect(onChain.notes).toContain('No contract addresses');
    });

    it('Scenario 8, 9, 10: Website and funding claims without sources remain unverified', async () => {
      mockGithubService.getRepository.mockResolvedValue({
        name: 'sample-project',
        language: 'TypeScript',
        topics: [],
        created_at: '2026-01-01T00:00:00Z',
        fork: false,
      });
      mockGithubService.getRecentCommitsCount.mockResolvedValue(0);
      mockGithubService.getContributorsCount.mockResolvedValue(1);
      mockGithubService.getReleasesCount.mockResolvedValue(0);

      const report = await service.investigateEntity({
        authorName: 'SampleProject',
        textSnippet: 'Building Web3 tools',
      });

      expect(report.fundingAnalysis.funders.length).toBe(0);
      expect(report.evidenceMatrix.funding.score).toBe(0);
      expect(report.evidenceMatrix.funding.missingReason).toBeDefined();
      expect(report.evidenceMatrix.incentives.score).toBe(0);
    });
  });

  describe('4. Repository Relationship Classification & Forks', () => {
    it('Scenario 14: Direct forks and templates are classified as FORK or TEMPLATE', async () => {
      mockGithubService.getRepository.mockResolvedValue({
        name: 'erc4337-example',
        language: 'Solidity',
        topics: ['example', 'tutorial'],
        created_at: '2026-01-01T00:00:00Z',
        fork: true,
      });
      mockGithubService.getRecentCommitsCount.mockResolvedValue(2);
      mockGithubService.getContributorsCount.mockResolvedValue(1);
      mockGithubService.getReleasesCount.mockResolvedValue(0);

      const res = await service.inspectGitHub('user', 'erc4337-example');
      expect(res.relationship).toBe(RepoRelationship.FORK);
    });
  });

  describe('5. Cohort A Frozen Baseline Inviolability', () => {
    it('Scenario 11 & 12: Deep investigation produces independent report without mutating frozen baseline', async () => {
      const frozenBaselineProject = {
        id: 'proj_frozen_1',
        name: 'Livestream Market',
        slug: 'livestream-market',
        baselineEarlynessScore: 94,
        baselineSignalStrength: 22.0,
        baselineDetectionLagDays: 2.1,
        baselineStage: ProjectStage.TESTNET,
      };

      mockPrisma.project.findUnique.mockResolvedValue(frozenBaselineProject);

      const report = await service.investigateEntity({
        authorName: 'Livestream Market',
        githubUrl: 'https://github.com/example/livestream',
      });

      expect(report).toBeDefined();
      // Ensure no update calls to baseline fields were made
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });
  });
});
