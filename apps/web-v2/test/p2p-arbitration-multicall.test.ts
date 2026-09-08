import { describe, it, expect } from 'vitest';
import { TradeState, EscrowTrade } from '../lib/contracts/escrow';

describe('P2P Arbitration Phase 1.1 Active Dispute Pagination & Scanner Tests', () => {
  const PAGE_SIZE = 25;
  const MULTICALL_CHUNK_SIZE = 50;
  const MAX_DISPUTE_SCAN_TRADES = 1000;

  const mockTrade = (id: number, state: TradeState): EscrowTrade => ({
    tradeId: BigInt(id),
    buyer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    seller: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    asset: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    amount: 1000000000000000000n,
    fiatAmount: 5000n,
    fiatCurrency:
      '0x494e520000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    state,
    paymentWindow: 3600n,
    fundingTimestamp: 1700000000n,
    paymentTimestamp: 1700000500n,
    paymentReference:
      '0x5554523132333435360000000000000000000000000000000000000000000000' as `0x${string}`,
    evidenceHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
    disputeInitiator: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  });

  // Helper simulating the bounded multicall dispute scanner
  function scanDisputes(
    allTradesMap: Map<number, EscrowTrade>,
    total: number,
    startScanId: number,
  ) {
    const collectedDisputes: EscrowTrade[] = [];
    let currentScanId = startScanId > 0 ? startScanId : total;
    let scannedCount = 0;
    let nextCursor = 0;

    while (
      currentScanId >= 1 &&
      collectedDisputes.length < PAGE_SIZE + 1 &&
      scannedCount < MAX_DISPUTE_SCAN_TRADES
    ) {
      const chunkSize = Math.min(MULTICALL_CHUNK_SIZE, currentScanId);
      const chunkIds: number[] = [];
      for (let i = 0; i < chunkSize; i++) {
        chunkIds.push(currentScanId - i);
      }

      // Simulate multicall chunk result
      for (let i = 0; i < chunkIds.length; i++) {
        const id = chunkIds[i];
        const trade = allTradesMap.get(id);
        if (trade && trade.state === TradeState.DISPUTED) {
          if (collectedDisputes.length < PAGE_SIZE) {
            collectedDisputes.push(trade);
          } else if (collectedDisputes.length === PAGE_SIZE) {
            nextCursor = id;
            collectedDisputes.push(trade);
            break;
          }
        }
      }

      scannedCount += chunkSize;
      currentScanId -= chunkSize;
    }

    const pageDisputes = collectedDisputes.slice(0, PAGE_SIZE);
    const hasNext = collectedDisputes.length > PAGE_SIZE;

    return { pageDisputes, hasNext, nextCursor, scannedCount };
  }

  it('1. 100 raw trades containing only 3 disputes -> Active Disputes returns 3 without fake slots', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 100; id++) {
      map.set(id, mockTrade(id, TradeState.RELEASED));
    }
    // Only 3 disputes
    map.set(12, mockTrade(12, TradeState.DISPUTED));
    map.set(45, mockTrade(45, TradeState.DISPUTED));
    map.set(88, mockTrade(88, TradeState.DISPUTED));

    const result = scanDisputes(map, 100, 100);
    expect(result.pageDisputes.length).toBe(3);
    expect(result.pageDisputes.map((t) => Number(t.tradeId))).toEqual([88, 45, 12]);
    expect(result.hasNext).toBe(false);
  });

  it('2. 100 raw trades containing 37 disputes -> Page 1 contains 25 disputes, Page 2 contains remaining 12', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 100; id++) {
      // Create 37 disputes: IDs 1..37 are DISPUTED, 38..100 are RELEASED
      if (id <= 37) {
        map.set(id, mockTrade(id, TradeState.DISPUTED));
      } else {
        map.set(id, mockTrade(id, TradeState.RELEASED));
      }
    }

    // Page 1
    const p1 = scanDisputes(map, 100, 100);
    expect(p1.pageDisputes.length).toBe(25);
    expect(p1.hasNext).toBe(true);
    expect(p1.pageDisputes[0].tradeId).toBe(37n);
    expect(p1.pageDisputes[24].tradeId).toBe(13n);
    expect(p1.nextCursor).toBe(12);

    // Page 2
    const p2 = scanDisputes(map, 100, p1.nextCursor);
    expect(p2.pageDisputes.length).toBe(12);
    expect(p2.hasNext).toBe(false);
    expect(p2.pageDisputes[0].tradeId).toBe(12n);
    expect(p2.pageDisputes[11].tradeId).toBe(1n);
  });

  it('3. Sparse disputes across 100 trades are all discovered', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 100; id++) {
      map.set(id, mockTrade(id, TradeState.RELEASED));
    }
    map.set(98, mockTrade(98, TradeState.DISPUTED));
    map.set(95, mockTrade(95, TradeState.DISPUTED));
    map.set(4, mockTrade(4, TradeState.DISPUTED));

    const result = scanDisputes(map, 100, 100);
    expect(result.pageDisputes.length).toBe(3);
    expect(result.pageDisputes.map((t) => Number(t.tradeId))).toEqual([98, 95, 4]);
  });

  it('4. Page 2 does not duplicate Page 1', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 60; id++) {
      map.set(id, mockTrade(id, TradeState.DISPUTED));
    }

    const p1 = scanDisputes(map, 60, 60);
    const p2 = scanDisputes(map, 60, p1.nextCursor);

    const p1Ids = new Set(p1.pageDisputes.map((t) => Number(t.tradeId)));
    const p2Ids = new Set(p2.pageDisputes.map((t) => Number(t.tradeId)));

    for (const id of p2Ids) {
      expect(p1Ids.has(id)).toBe(false);
    }
  });

  it('5. Newest-first disputed ordering is strictly preserved', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 30; id++) {
      map.set(id, mockTrade(id, TradeState.DISPUTED));
    }
    const result = scanDisputes(map, 30, 30);
    const ids = result.pageDisputes.map((t) => Number(t.tradeId));
    for (let i = 0; i < ids.length - 1; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i + 1]);
    }
  });

  it('6. Trade #2 (CREATED / Pending Funding) is never collected in Active Disputes', () => {
    const map = new Map<number, EscrowTrade>();
    map.set(1, mockTrade(1, TradeState.RELEASED));
    map.set(2, mockTrade(2, TradeState.CREATED));
    map.set(3, mockTrade(3, TradeState.DISPUTED));

    const result = scanDisputes(map, 3, 3);
    expect(result.pageDisputes.length).toBe(1);
    expect(result.pageDisputes[0].tradeId).toBe(3n);
    expect(result.pageDisputes.some((t) => Number(t.tradeId) === 2)).toBe(false);
  });

  it('11. Zero disputes returns empty page with hasNext = false', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 50; id++) {
      map.set(id, mockTrade(id, TradeState.RELEASED));
    }
    const result = scanDisputes(map, 50, 50);
    expect(result.pageDisputes.length).toBe(0);
    expect(result.hasNext).toBe(false);
  });

  it('12. Exactly 25 disputes returns 25 items with hasNext = false', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 25; id++) {
      map.set(id, mockTrade(id, TradeState.DISPUTED));
    }
    const result = scanDisputes(map, 25, 25);
    expect(result.pageDisputes.length).toBe(25);
    expect(result.hasNext).toBe(false);
  });

  it('13. Exactly 26 disputes returns 25 items with hasNext = true and nextCursor = 1', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 26; id++) {
      map.set(id, mockTrade(id, TradeState.DISPUTED));
    }
    const result = scanDisputes(map, 26, 26);
    expect(result.pageDisputes.length).toBe(25);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toBe(1);
  });

  it('14. Scan bound is respected (scans at most MAX_DISPUTE_SCAN_TRADES)', () => {
    const map = new Map<number, EscrowTrade>();
    for (let id = 1; id <= 1500; id++) {
      map.set(id, mockTrade(id, TradeState.RELEASED));
    }
    const result = scanDisputes(map, 1500, 1500);
    expect(result.scannedCount).toBe(MAX_DISPUTE_SCAN_TRADES);
    expect(result.pageDisputes.length).toBe(0);
  });
});
