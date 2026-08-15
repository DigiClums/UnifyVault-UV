import { describe, expect, it } from 'vitest';

export function calculateSafeFromBlock(latestBlock: bigint, maxSpan: bigint = 1999n): bigint {
  return latestBlock >= maxSpan ? latestBlock - maxSpan : 0n;
}

export function getRequestedBlockCount(fromBlock: bigint, toBlock: bigint): bigint {
  if (toBlock < fromBlock) return 0n;
  return toBlock - fromBlock + 1n;
}

describe('RPC Block Range Safeguards', () => {
  it('ensures requested block range is <= 2000 blocks for standard max span 1999n', () => {
    const latestBlock = 18000000n;
    const fromBlock = calculateSafeFromBlock(latestBlock, 1999n);
    const count = getRequestedBlockCount(fromBlock, latestBlock);
    expect(count).toBe(2000n);
    expect(count <= 2000n).toBe(true);
  });

  it('handles small block numbers safely without underflow', () => {
    const latestBlock = 500n;
    const fromBlock = calculateSafeFromBlock(latestBlock, 1999n);
    const count = getRequestedBlockCount(fromBlock, latestBlock);
    expect(fromBlock).toBe(0n);
    expect(count).toBe(501n);
    expect(count <= 2000n).toBe(true);
  });

  it('prevents 2001 block range error when latestBlock - 2000n was previously used', () => {
    const latestBlock = 100000n;
    // Faulty logic previously: latestBlock - 2000n to latestBlock => 2001 blocks
    const oldFromBlock = latestBlock - 2000n;
    const oldCount = getRequestedBlockCount(oldFromBlock, latestBlock);
    expect(oldCount).toBe(2001n); // This causes "query exceeds max block range 2000"

    // Fixed logic: latestBlock - 1999n to latestBlock => 2000 blocks
    const newFromBlock = calculateSafeFromBlock(latestBlock, 1999n);
    const newCount = getRequestedBlockCount(newFromBlock, latestBlock);
    expect(newCount).toBe(2000n);
  });
});
