import type { PublicClient } from 'viem';

/**
 * Fetches the current transaction nonce for a given address.
 *
 * Uses `blockTag: 'pending'` to include pending transactions in the mempool,
 * preventing "nonce too low" errors when submitting sequential transactions.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAFEPAL NOTE — prefer WalletConnect over the injected provider.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SafePal's injected EVM provider uses a proprietary RPC backend that does
 * not honor dApp-provided nonces and maintains its own pending-state tracking.
 *
 * Resolution (conclusive, 2026-08-09):
 *   Use the WalletConnect connector for SafePal.  WalletConnect delegates
 *   nonce management to SafePal's own infrastructure correctly, and the
 *   approve → deposit flow works with consecutive correct nonces.
 *   The normal injected flow remains unchanged for MetaMask and all other
 *   supported wallets.
 *
 * See: docs/safepal-nonce-investigation.md for the full investigation report.
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
