import type { PublicClient } from 'viem';

/**
 * Fetches the current transaction nonce for a given address.
 *
 * Uses `blockTag: 'pending'` to include pending transactions in the mempool,
 * preventing "nonce too low" errors when submitting sequential transactions.
 *
 * SafePal and some mobile wallet providers do not reliably auto-populate the
 * nonce on `eth_sendTransaction`. This helper lets the dApp explicitly provide
 * a correct nonce so the wallet does not default to 0.
 */
export async function getTransactionNonce(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<number> {
  return publicClient.getTransactionCount({
    address,
    blockTag: 'pending',
  });
}
