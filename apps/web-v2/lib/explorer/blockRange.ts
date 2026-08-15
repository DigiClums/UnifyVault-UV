import { MAX_BLOCK_WINDOW, type BlockWindow } from './types';

/**
 * Validates that a block range is within the safe maximum (1500 blocks).
 * Throws if the range exceeds 2000 blocks (Base RPC limit).
 */
export function validateBlockRange(fromBlock: bigint, toBlock: bigint): void {
  const span = toBlock - fromBlock + 1n;
  if (span > 2000n) {
    throw new Error(`Block range ${fromBlock}→${toBlock} spans ${span} blocks (max 2000)`);
  }
}

/**
 * Calculate a safe fromBlock given a toBlock and window size.
 * Default window: MAX_BLOCK_WINDOW (1500).
 * Guarantees: toBlock - fromBlock + 1 <= 2000
 */
export function calculateFromBlock(toBlock: bigint, windowSize: bigint = MAX_BLOCK_WINDOW): bigint {
  const span = windowSize - 1n;
  return toBlock > span ? toBlock - span : 0n;
}

/**
 * Get the block window for a given page index.
 * Page 0 = latest 1500 blocks.
 * Page 1 = previous 1500 blocks.
 * etc.
 */
export function getBlockWindow(latestBlock: bigint, pageIndex: number): BlockWindow {
  const toBlock = latestBlock - BigInt(pageIndex) * MAX_BLOCK_WINDOW;
  if (toBlock <= 0n) {
    return { fromBlock: 0n, toBlock: 0n, pageIndex };
  }
  const fromBlock = calculateFromBlock(toBlock);
  return { fromBlock, toBlock, pageIndex };
}

/**
 * Check if another page of older blocks exists.
 */
export function hasOlderBlocks(latestBlock: bigint, pageIndex: number): boolean {
  const nextToBlock = latestBlock - BigInt(pageIndex) * MAX_BLOCK_WINDOW;
  return nextToBlock > MAX_BLOCK_WINDOW;
}
