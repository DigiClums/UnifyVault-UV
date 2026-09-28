import { ValidationService } from './validation.service';
import { SignalType, OutcomeStatus, ExternalDiscoveryType, RejectionReason } from '@prisma/client';

describe('ValidationService', () => {
  let service: ValidationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      projectOutcome: {
        create: jest.fn(),
      },
      externalDiscoveryEvent: {
        create: jest.fn(),
      },
      projectSnapshot: {
        create: jest.fn(),
      },
      projectTimelineEvent: {
        create: jest.fn(),
      },
    };
    service = new ValidationService(mockPrisma);
  });

  describe('Mathematical Calculations & Null Handling', () => {
    it('should correctly calculate median and handle null when empty', () => {
      expect((service as any).calculateMedian([])).toBeNull();
      expect((service as any).calculateMedian([10])).toBe(10);
      expect((service as any).calculateMedian([10, 20])).toBe(15);
      expect((service as any).calculateMedian([5, 12, 20])).toBe(12);
    });

    it('should accurately calculate source precedence', () => {
      // X before GitHub
      const xFirst = service.determineSourcePrecedence({
        firstXSignalAt: new Date('2026-09-01'),
        githubCreatedAt: new Date('2026-09-05'),
        signals: [],
      });
      expect(xFirst.source).toBe('X');
      expect(xFirst.sequenceLabel).toBe('X → GitHub');

      // GitHub before X
      const ghFirst = service.determineSourcePrecedence({
        firstXSignalAt: new Date('2026-09-10'),
        githubCreatedAt: new Date('2026-09-05'),
        signals: [],
      });
      expect(ghFirst.source).toBe('GITHUB');
      expect(ghFirst.sequenceLabel).toBe('GitHub → X');

      // Simultaneous (< 6 hours difference)
      const sim = service.determineSourcePrecedence({
        firstXSignalAt: new Date('2026-09-05T10:00:00Z'),
        githubCreatedAt: new Date('2026-09-05T12:00:00Z'),
        signals: [],
      });
      expect(sim.source).toBe('SIMULTANEOUS');
    });

    it('should extract chronological signal sequence', () => {
      const signals = [
        {
          type: SignalType.CONTRACT_DEPLOYMENT,
          detectedAt: new Date('2026-09-15'),
          source: 'Base',
        },
        {
          type: SignalType.GITHUB_REPOSITORY_CREATED,
          detectedAt: new Date('2026-09-01'),
          source: 'GitHub',
        },
        {
          type: SignalType.GITHUB_COMMIT_ACTIVITY,
          detectedAt: new Date('2026-09-05'),
          source: 'GitHub',
        },
      ];
      const seq = service.extractSignalSequence(signals);
      expect(seq).toEqual([
        'GITHUB_REPOSITORY_CREATED',
        'GITHUB_COMMIT_ACTIVITY',
        'CONTRACT_DEPLOYMENT',
      ]);
    });
  });

  describe('External Discovery & Lead Time', () => {
    it('should compute positive lead time when Radar detected before external event', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        firstRadarScanAt: new Date('2026-09-01T00:00:00Z'),
      });
      mockPrisma.externalDiscoveryEvent.create.mockResolvedValue({
        id: 'evt-1',
        projectId: 'proj-1',
        source: 'RootData',
        discoveryType: ExternalDiscoveryType.PROJECT_DIRECTORY,
        discoveredAt: new Date('2026-09-17T00:00:00Z'),
        evidence: 'Listed on RootData directory',
      });
      mockPrisma.project.update.mockResolvedValue({});
      mockPrisma.projectTimelineEvent.create.mockResolvedValue({});

      const res = await service.recordExternalDiscovery('proj-1', {
        source: 'RootData',
        discoveryType: ExternalDiscoveryType.PROJECT_DIRECTORY,
        discoveredAt: new Date('2026-09-17T00:00:00Z'),
        evidence: 'Listed on RootData directory',
      });

      expect(res.actualLeadTimeDays).toBe(16);
      expect(res.leadMessage).toBe('Radar detected this 16 days before external discovery.');
    });

    it('should compute negative lead time when Radar detected after external event without hiding it', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-2',
        name: 'Late Project',
        firstRadarScanAt: new Date('2026-09-18T00:00:00Z'),
      });
      mockPrisma.externalDiscoveryEvent.create.mockResolvedValue({
        id: 'evt-2',
        projectId: 'proj-2',
        source: 'CryptoRank',
        discoveryType: ExternalDiscoveryType.AIRDROP_TRACKER,
        discoveredAt: new Date('2026-09-14T00:00:00Z'),
        evidence: 'Airdrop page published on CryptoRank',
      });
      mockPrisma.project.update.mockResolvedValue({});
      mockPrisma.projectTimelineEvent.create.mockResolvedValue({});

      const res = await service.recordExternalDiscovery('proj-2', {
        source: 'CryptoRank',
        discoveryType: ExternalDiscoveryType.AIRDROP_TRACKER,
        discoveredAt: new Date('2026-09-14T00:00:00Z'),
        evidence: 'Airdrop page published on CryptoRank',
      });

      expect(res.actualLeadTimeDays).toBe(-4);
      expect(res.leadMessage).toBe('Radar detected this 4 days after external discovery.');
    });
  });
});
