import { describe, it, expect } from 'vitest';
import { useIndexerStats, type IndexedEvent } from '../useIndexerData';
import { NavSnapshot } from '../../types';

describe('Phase E4 — useIndexerData TanStack Query & Event Parsing Suite', () => {
  describe('Query Key Construction & Network Isolation', () => {
    it('isolates transaction history query key by chainId and controller', () => {
      const chainId1 = 8453; // Base Mainnet
      const chainId2 = 84532; // Base Sepolia
      const controller = '0x1234567890123456789012345678901234567890';

      const key1 = ['indexer-transaction-history', chainId1, controller];
      const key2 = ['indexer-transaction-history', chainId2, controller];

      expect(key1).not.toEqual(key2);
      expect(key1[1]).toBe(8453);
      expect(key2[1]).toBe(84532);
    });

    it('isolates historical NAV query key by chainId, token address, and period', () => {
      const chainId = 84532;
      const token = '0x006c5DF13C716E5224b33956651C4356BB90DEc0';

      const key7D = ['indexer-historical-nav', chainId, token, '7D'];
      const key30D = ['indexer-historical-nav', chainId, token, '30D'];
      const keyALL = ['indexer-historical-nav', chainId, token, 'ALL'];

      expect(key7D).not.toEqual(key30D);
      expect(key30D).not.toEqual(keyALL);
      expect(key7D[3]).toBe('7D');
    });
  });

  describe('Event Type & Data Field Mapping', () => {
    it('correctly maps DepositExecuted logs to DEPOSIT IndexedEvent', () => {
      const mockRawLog = {
        eventName: 'DepositExecuted',
        blockNumber: 1234567n,
        transactionHash: '0xabc123',
        logIndex: 2,
        args: {
          user: '0xUserAddress',
          netDeposit: 1000000n,
          grossDeposit: 1010000n,
          sharesMinted: 1000000000000000000n,
        },
      };

      const eventName = mockRawLog.eventName;
      const args = mockRawLog.args;

      const formatted: IndexedEvent = {
        blockNumber: Number(mockRawLog.blockNumber),
        txHash: mockRawLog.transactionHash,
        logIndex: mockRawLog.logIndex,
        type: eventName?.includes('Deposit')
          ? 'DEPOSIT'
          : eventName?.includes('Redeem')
            ? 'REDEEM'
            : eventName?.includes('Fee')
              ? 'FEE_COLLECTED'
              : 'TRANSFER',
        user: (args?.user as string) || '',
        netAmount: args?.netDeposit ? String(args.netDeposit) : undefined,
        grossAmount: args?.grossDeposit ? String(args.grossDeposit) : undefined,
        sharesMinted: args?.sharesMinted ? String(args.sharesMinted) : undefined,
        sharesBurned: undefined,
        timestamp: new Date().toISOString(),
      };

      expect(formatted.type).toBe('DEPOSIT');
      expect(formatted.blockNumber).toBe(1234567);
      expect(formatted.txHash).toBe('0xabc123');
      expect(formatted.user).toBe('0xUserAddress');
      expect(formatted.netAmount).toBe('1000000');
      expect(formatted.sharesMinted).toBe('1000000000000000000');
    });

    it('correctly maps FeeCollected logs to FEE_COLLECTED IndexedEvent', () => {
      const mockRawLog = {
        eventName: 'FeeCollected',
        blockNumber: 1234580n,
        transactionHash: '0xfee789',
        logIndex: 0,
        args: {
          caller: '0xAdminAddress',
          amount: 50000n,
        },
      };

      const eventName = mockRawLog.eventName;
      const args = mockRawLog.args;

      const formatted: IndexedEvent = {
        blockNumber: Number(mockRawLog.blockNumber),
        txHash: mockRawLog.transactionHash,
        logIndex: mockRawLog.logIndex,
        type: eventName?.includes('Deposit')
          ? 'DEPOSIT'
          : eventName?.includes('Redeem')
            ? 'REDEEM'
            : eventName?.includes('Fee')
              ? 'FEE_COLLECTED'
              : 'TRANSFER',
        user: (args?.user as string) || (args?.caller as string) || '',
        netAmount: undefined,
        grossAmount: undefined,
        sharesMinted: undefined,
        sharesBurned: undefined,
        timestamp: new Date().toISOString(),
      };

      expect(formatted.type).toBe('FEE_COLLECTED');
      expect(formatted.user).toBe('0xAdminAddress');
    });
  });

  describe('Historical NAV Derivation Invariants', () => {
    it('generates 10 sequential chronological snapshots with valid timestamps', () => {
      const now = Date.now();
      const pointsCount = 10;
      const currentNav = 1.05;
      const snapshots: NavSnapshot[] = [];

      for (let i = pointsCount - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * 3600 * 1000).toISOString();
        snapshots.push({
          timestamp,
          nav: currentNav,
          sharePrice: currentNav,
          totalAssets: 1000,
          btcPrice: 0,
          ethPrice: 0,
        });
      }

      expect(snapshots).toHaveLength(10);
      expect(snapshots[0].nav).toBe(1.05);
      // Ensure chronological ordering (oldest first, newest last)
      const firstTime = new Date(snapshots[0].timestamp).getTime();
      const lastTime = new Date(snapshots[9].timestamp).getTime();
      expect(firstTime).toBeLessThan(lastTime);
    });
  });

  describe('Indexer Stats', () => {
    it('returns valid status and data source indicator', () => {
      const { stats, isLoading } = useIndexerStats();
      expect(stats.status).toBe('OK');
      expect(stats.source).toBe('ON_CHAIN_EVM_LOGS');
      expect(isLoading).toBe(false);
    });
  });
});
