/**
 * Bounded in-memory block timestamp cache keyed by `${chainId}:${blockNumber}`.
 * Maps network + block number to exact Unix timestamp (seconds).
 */
const MAX_CACHE_ENTRIES = 1000;
const blockTimestampCache = new Map<string, number>();

function getCacheKey(chainId: number, blockNumber: bigint): string {
  return `${chainId}:${blockNumber.toString()}`;
}

export function getCachedBlockTimestamp(chainId: number, blockNumber: bigint): number | undefined {
  return blockTimestampCache.get(getCacheKey(chainId, blockNumber));
}

export function setCachedBlockTimestamp(
  chainId: number,
  blockNumber: bigint,
  timestamp: number,
): void {
  if (blockTimestampCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = blockTimestampCache.keys().next().value;
    if (firstKey) blockTimestampCache.delete(firstKey);
  }
  blockTimestampCache.set(getCacheKey(chainId, blockNumber), timestamp);
}

export function clearBlockTimestampCache(): void {
  blockTimestampCache.clear();
}

export interface MinimalBlockClient {
  getBlock: (args: { blockNumber: bigint }) => Promise<{ timestamp: bigint }>;
}

/**
 * Batched, deduplicated exact block timestamp resolver.
 *
 * 1. Collects unique block numbers from event logs.
 * 2. Checks memory cache for previously resolved blocks (0 RPC calls).
 * 3. Fetches uncached unique blocks concurrently (1 RPC call per unique block number).
 * 4. Preserves 100% exact on-chain block timestamps.
 * 5. If an RPC call fails, does NOT fabricate or estimate timestamps with Date.now();
 *    leaves the block timestamp undefined so UI displays "Timestamp unavailable" safely.
 */
export async function prefetchBlockTimestamps(
  publicClient: MinimalBlockClient | null | undefined,
  chainId: number,
  blockNumbers: (bigint | undefined | null)[],
): Promise<Map<bigint, number>> {
  const result = new Map<bigint, number>();
  if (!publicClient || !blockNumbers.length) return result;

  // 1. Deduplicate valid positive block numbers
  const uniqueBlocks = Array.from(
    new Set(blockNumbers.filter((b): b is bigint => typeof b === 'bigint' && b > 0n)),
  );

  const missingBlocks: bigint[] = [];

  // 2. Lookup cached timestamps
  for (const blockNumber of uniqueBlocks) {
    const cached = getCachedBlockTimestamp(chainId, blockNumber);
    if (cached !== undefined) {
      result.set(blockNumber, cached);
    } else {
      missingBlocks.push(blockNumber);
    }
  }

  if (missingBlocks.length === 0) {
    return result;
  }

  // 3. Fetch missing unique blocks in parallel (1 request per unique block)
  await Promise.all(
    missingBlocks.map(async (blockNumber) => {
      try {
        const block = await publicClient.getBlock({ blockNumber });
        const ts = Number(block.timestamp);
        setCachedBlockTimestamp(chainId, blockNumber, ts);
        result.set(blockNumber, ts);
      } catch (err) {
        console.warn(
          `[blockTimestamp] Failed fetching exact timestamp for block ${blockNumber}:`,
          err,
        );
        // Data integrity rule: Do NOT fabricate a timestamp or use Date.now().
        // Do not cache failure so subsequent attempts can retry cleanly.
      }
    }),
  );

  return result;
}
