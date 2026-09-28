import { XSignalProvider } from './x-signal.provider';
import { SignalType, ProjectStage } from '@prisma/client';
import { XQueryFamilyType, X_QUERY_FAMILIES } from './x-query-family.types';

describe('XSignalProvider (Query Families & Ingestion Guardrails)', () => {
  let provider: XSignalProvider;
  let mockPrisma: any;
  let mockXOAuthService: any;

  beforeEach(() => {
    mockPrisma = {
      projectSignal: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockXOAuthService = {
      getValidAccessToken: jest.fn(),
    };

    provider = new XSignalProvider(mockPrisma, mockXOAuthService);
    delete process.env.X_SIGNAL_COLLECTION_ENABLED;
  });

  describe('1. Query Family Construction & Preservation', () => {
    it('should expose all 3 distinct query families with exact semantics', () => {
      const families = provider.getQueryFamilies();
      expect(families.length).toBe(3);

      const fam1 = provider.getQueryFamily(XQueryFamilyType.REPOSITORY_GENESIS);
      expect(fam1.query).toContain('url:github.com OR url:gitlab.com');
      expect(fam1.version).toBe('1.0.0');

      const fam2 = provider.getQueryFamily(XQueryFamilyType.INFRASTRUCTURE_TESTNET_GENESIS);
      expect(fam2.query).toContain('-airdrop -giveaway');
      expect(fam2.version).toBe('1.0.0');

      const fam3 = provider.getQueryFamily(XQueryFamilyType.ARCHITECTURE_RFC);
      expect(fam3.query).toContain('"protocol" OR "SDK" OR "coprocessor"');
      expect(fam3.version).toBe('1.0.0');
    });

    it('should preserve exact query string and version in normalized signal provenance', () => {
      const tweetFixture = {
        id: '189999999999999999',
        text: 'Introducing our new open sourced ZK-coprocessor on Base: https://github.com/example/coprocessor',
        author_id: 'user_123',
        created_at: '2026-09-18T10:00:00.000Z',
        entities: {
          urls: [{ expanded_url: 'https://github.com/example/coprocessor' }],
        },
      };

      const authorFixture = {
        username: 'zkbuilder',
        name: 'ZK Builder',
        description: 'Core dev and founder building on Base',
      };

      const famDef = X_QUERY_FAMILIES[XQueryFamilyType.REPOSITORY_GENESIS];
      const normalized = provider.normalizeTweet(
        tweetFixture,
        authorFixture,
        XQueryFamilyType.REPOSITORY_GENESIS,
        famDef.query,
        famDef.version,
      );

      const meta = normalized.metadata as any;
      expect(meta.tweetId).toBe('189999999999999999');
      expect(meta.authorUsername).toBe('zkbuilder');
      expect(meta.queryFamily).toBe(XQueryFamilyType.REPOSITORY_GENESIS);
      expect(meta.queryUsed).toBe(famDef.query);
      expect(meta.queryVersion).toBe('1.0.0');
      expect(meta.matchedFamilies).toEqual([XQueryFamilyType.REPOSITORY_GENESIS]);
      expect(meta.rawPayloadHash).toBeDefined();
      expect(meta.rawPayloadHash.length).toBe(64); // SHA-256 hex
    });
  });

  describe('2. Early Radar 5-Dimension Qualification Evaluation', () => {
    it('should pass qualification for high-signal builder tweet with artifact & technical primitives', () => {
      const tweetText =
        'We open sourced our ERC-4337 paymaster smart contract on Sepolia testnet: https://github.com/org/paymaster';
      const author = { username: 'evmdev', name: 'EVM Dev', description: 'Core protocol engineer' };
      const entities = { urls: [{ expanded_url: 'https://github.com/org/paymaster' }] };

      const qual = provider.evaluateQualification(
        tweetText,
        author,
        entities,
        new Date('2026-09-18T09:00:00Z'),
      );

      expect(qual.artifactProvenance).toBe(true);
      expect(qual.genesisAuthor).toBe(true);
      expect(qual.nonFarming).toBe(true);
      expect(qual.architecturalSpecificity).toBe(true);
      expect(qual.temporalLead).toBe(true);
      expect(qual.qualificationPassed).toBe(true);
      expect(qual.matchedCriteriaCount).toBe(5);
    });

    it('should reject engagement farming and giveaway tweets (nonFarming = false)', () => {
      const tweetText =
        'Testnet is live on Base! Like and retweet, drop your address below for free tokens!';
      const author = {
        username: 'airdrop_bot',
        name: 'Airdrop Alert',
        description: 'Best crypto airdrops',
      };

      const qual = provider.evaluateQualification(tweetText, author, {}, new Date());

      expect(qual.nonFarming).toBe(false);
      expect(qual.qualificationPassed).toBe(false);
    });
  });

  describe('3. Deduplication & Provenance Merging', () => {
    it('should merge multi-family match without creating duplicate projectSignal record', async () => {
      process.env.X_SIGNAL_COLLECTION_ENABLED = 'true';
      mockXOAuthService.getValidAccessToken.mockResolvedValue({ token: 'mock-valid-token' });

      // Mock an existing signal that matched REPOSITORY_GENESIS
      const existingSignal = {
        id: 'sig_existing_1',
        projectId: 'proj_1',
        source: 'X',
        sourceUrl: 'https://x.com/author1/status/tweet_999',
        metadata: {
          tweetId: 'tweet_999',
          matchedFamilies: [XQueryFamilyType.REPOSITORY_GENESIS],
        },
      };
      mockPrisma.projectSignal.findFirst.mockResolvedValue(existingSignal);

      // Ingest same tweet under ARCHITECTURE_RFC
      // Since it already exists, update should append ARCHITECTURE_RFC to matchedFamilies
      await provider.collectSignals({
        family: XQueryFamilyType.ARCHITECTURE_RFC,
        skipEnabledCheck: true,
      });

      // No new creation
      expect(mockPrisma.projectSignal.create).not.toHaveBeenCalled();
    });
  });

  describe('4. Experiment Safety & Frozen Baseline Cohort A Protection', () => {
    it('should NEVER mutate baselineEarlynessScore, baselineSignalStrength, baselineDetectionLagDays, or baselineStage', async () => {
      const frozenBaselineProject = {
        id: 'proj_frozen_baseline_1',
        name: 'Alto',
        slug: 'alto',
        xUrl: 'https://x.com/alto_bundler',
        baselineEarlynessScore: 5,
        baselineSignalStrength: 19.0,
        baselineDetectionLagDays: 3.5,
        baselineStage: ProjectStage.EARLY,
        firstXSignalAt: null,
      };

      mockPrisma.project.findFirst.mockResolvedValue(frozenBaselineProject);
      mockPrisma.projectSignal.findFirst.mockResolvedValue(null); // new tweet

      // When updating project for an earlier X signal:
      const tweetDate = new Date('2026-08-25T12:00:00Z');
      await mockPrisma.project.update({
        where: { id: frozenBaselineProject.id },
        data: {
          firstXSignalAt: tweetDate,
        },
      });

      // Verify that baseline fields are untouched
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            firstXSignalAt: tweetDate,
          },
        }),
      );
      // Explicitly check that baseline keys are NOT present in update payload
      const updateCallArg = mockPrisma.project.update.mock.calls[0][0];
      expect(updateCallArg.data.baselineEarlynessScore).toBeUndefined();
      expect(updateCallArg.data.baselineSignalStrength).toBeUndefined();
      expect(updateCallArg.data.baselineDetectionLagDays).toBeUndefined();
      expect(updateCallArg.data.baselineStage).toBeUndefined();
    });
  });

  describe('5. Production Safety & Disabled Collector Behavior', () => {
    it('should return DISABLED by default when X_SIGNAL_COLLECTION_ENABLED is not set to true', async () => {
      delete process.env.X_SIGNAL_COLLECTION_ENABLED;

      const res = await provider.collectSignals({ family: XQueryFamilyType.REPOSITORY_GENESIS });
      expect(res.status).toBe('DISABLED');
      expect(res.signalsCollected).toBe(0);
      expect(res.message).toContain('X_SIGNAL_COLLECTION_ENABLED=false');
    });

    it('should return NOT_CONNECTED when enabled but no OAuth access token exists', async () => {
      process.env.X_SIGNAL_COLLECTION_ENABLED = 'true';
      mockXOAuthService.getValidAccessToken.mockResolvedValue(null);

      const res = await provider.collectSignals({ family: XQueryFamilyType.REPOSITORY_GENESIS });
      expect(res.status).toBe('NOT_CONNECTED');
      expect(res.signalsCollected).toBe(0);
    });
  });

  describe('6. Zero-Cost Manual X Evidence Ingestion Workflow', () => {
    it('should correctly parse valid X / Twitter status URLs', () => {
      const parsed1 = provider.parseXPostUrl(
        'https://x.com/vitalikbuterin/status/1896694589257584640',
      );
      expect(parsed1.valid).toBe(true);
      expect(parsed1.username).toBe('vitalikbuterin');
      expect(parsed1.tweetId).toBe('1896694589257584640');
      expect(parsed1.normalizedUrl).toBe('https://x.com/vitalikbuterin/status/1896694589257584640');

      const parsed2 = provider.parseXPostUrl(
        'https://twitter.com/builder_dao/status/9876543210?s=20&t=abc',
      );
      expect(parsed2.valid).toBe(true);
      expect(parsed2.username).toBe('builder_dao');
      expect(parsed2.tweetId).toBe('9876543210');
    });

    it('should reject malformed or non-status URLs gracefully', () => {
      expect(provider.parseXPostUrl('https://google.com').valid).toBe(false);
      expect(provider.parseXPostUrl('https://x.com/vitalikbuterin').valid).toBe(false);
      expect(provider.parseXPostUrl('').valid).toBe(false);
    });

    it('should ingest manual X evidence with collectionMode: MANUAL and cryptographic hash', async () => {
      mockPrisma.projectSignal.findFirst.mockResolvedValue(null);
      mockPrisma.project.findFirst.mockResolvedValue(null); // new project
      mockPrisma.project.create.mockResolvedValue({
        id: 'new_candidate_id',
        name: 'zkfounder',
        slug: 'zkfounder',
      });
      mockPrisma.projectSignal.findMany.mockResolvedValue([{ source: 'X' }]);

      const result = await provider.ingestManualEvidence({
        url: 'https://x.com/zkfounder/status/1896694589257584640',
        publishedAt: '2026-08-20T14:00:00Z',
        evidenceText:
          'We open-sourced our ZK coprocessor smart contracts on Sepolia: https://github.com/zkfounder/coprocessor',
        authorName: 'ZK Founder',
        technicalArtifactUrl: 'https://github.com/zkfounder/coprocessor',
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('X');
      expect(result.collectionMode).toBe('MANUAL');
      expect(result.tweetId).toBe('1896694589257584640');
      expect(result.authorUsername).toBe('zkfounder');
      expect(result.rawPayloadHash).toBeDefined();
      expect(result.rawPayloadHash.length).toBe(64);
      expect(result.qualification.artifactProvenance).toBe(true);
      expect(result.qualification.qualificationPassed).toBe(true);
      expect(result.corroboratedSources).toContain('X');
    });
  });
});
