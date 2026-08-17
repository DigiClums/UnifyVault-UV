import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prefetchBlockTimestamps,
  getCachedBlockTimestamp,
  setCachedBlockTimestamp,
  clearBlockTimestampCache,
  type MinimalBlockClient,
} from '../blockTimestamp';

describe('Phase E3 — Block Timestamp Batched Prefetch & Deduplication', () => {
  beforeEach(() => {
    clearBlockTimestampCache();
  });

  it('deduplicates block numbers and executes exactly 1 RPC call per unique block', async () => {
    const mockGetBlock = vi
      .fn()
      .mockImplementation(async ({ blockNumber }: { blockNumber: bigint }) => {
        return { timestamp: blockNumber * 100n };
      });

    const mockClient: MinimalBlockClient = {
      getBlock: mockGetBlock,
    };

    // 10 events across 3 unique blocks: 100n, 200n, 300n
    const blockNumbers = [100n, 100n, 100n, 200n, 200n, 300n, 300n, 300n, 300n, 300n];

    const chainId = 84532;
    const timestamps = await prefetchBlockTimestamps(mockClient, chainId, blockNumbers);

    // Verified: Exactly 3 RPC calls for 10 events!
    expect(mockGetBlock).toHaveBeenCalledTimes(3);
    expect(timestamps.get(100n)).toBe(10000);
    expect(timestamps.get(200n)).toBe(20000);
    expect(timestamps.get(300n)).toBe(30000);
  });

  it('serves previously cached block timestamps with 0 RPC calls on subsequent requests', async () => {
    const mockGetBlock = vi
      .fn()
      .mockImplementation(async ({ blockNumber }: { blockNumber: bigint }) => {
        return { timestamp: blockNumber * 100n };
      });

    const mockClient: MinimalBlockClient = {
      getBlock: mockGetBlock,
    };

    const chainId = 84532;

    // First query: 2 unique blocks
    await prefetchBlockTimestamps(mockClient, chainId, [100n, 200n]);
    expect(mockGetBlock).toHaveBeenCalledTimes(2);

    mockGetBlock.mockClear();

    // Second query with same blocks + 1 new block (300n)
    const timestamps = await prefetchBlockTimestamps(mockClient, chainId, [100n, 200n, 300n]);

    // Only the single missing block was fetched!
    expect(mockGetBlock).toHaveBeenCalledTimes(1);
    expect(timestamps.get(100n)).toBe(10000);
    expect(timestamps.get(200n)).toBe(20000);
    expect(timestamps.get(300n)).toBe(30000);
  });

  it('preserves data integrity on RPC failure: returns undefined and does NOT fabricate a timestamp or use Date.now()', async () => {
    const mockGetBlock = vi.fn().mockRejectedValue(new Error('RPC Timeout'));

    const mockClient: MinimalBlockClient = {
      getBlock: mockGetBlock,
    };

    const chainId = 84532;
    const timestamps = await prefetchBlockTimestamps(mockClient, chainId, [999n]);

    expect(mockGetBlock).toHaveBeenCalledTimes(1);
    // Verified: Must NOT return current timestamp or fabricate data
    expect(timestamps.get(999n)).toBeUndefined();
    // Cache must remain clean for retry
    expect(getCachedBlockTimestamp(chainId, 999n)).toBeUndefined();
  });

  it('isolates cache entries across different chains', async () => {
    setCachedBlockTimestamp(8453, 100n, 1111);
    setCachedBlockTimestamp(84532, 100n, 2222);

    expect(getCachedBlockTimestamp(8453, 100n)).toBe(1111);
    expect(getCachedBlockTimestamp(84532, 100n)).toBe(2222);
  });

  it('handles empty block array or null client safely', async () => {
    const timestamps = await prefetchBlockTimestamps(null, 84532, []);
    expect(timestamps.size).toBe(0);
  });
});
