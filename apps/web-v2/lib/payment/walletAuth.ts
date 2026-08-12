import { verifyMessage, isAddress } from 'viem';

export interface WalletAuthPayload {
  userAddress: string;
  timestamp: number;
  signature: string;
  action: string; // e.g. "payment-intent" or "payment-claim" or "set-seller-upi"
  tradeId?: number;
}

/**
 * Constructs canonical message string for wallet authentication signing
 */
export function constructAuthMessage(action: string, tradeId: number, timestamp: number): string {
  return `UnifyVault Authentication\nAction: ${action}\nTrade ID: ${tradeId}\nTimestamp: ${timestamp}`;
}

/**
 * Cryptographically verifies wallet control via Viem verifyMessage.
 * Prevents userAddress spoofing.
 */
export async function verifyWalletAuth(
  payload: WalletAuthPayload,
): Promise<{ isValid: boolean; error?: string }> {
  const { userAddress, timestamp, signature, action, tradeId = 0 } = payload;

  if (!userAddress || !isAddress(userAddress)) {
    return { isValid: false, error: 'Invalid userAddress format.' };
  }

  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { isValid: false, error: 'Missing or invalid cryptographic signature.' };
  }

  // Timestamp Freshness Check (5 minute window)
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  if (isNaN(timestamp) || diff > 5 * 60 * 1000) {
    return {
      isValid: false,
      error: 'Authentication signature expired or timestamp out of bounds.',
    };
  }

  // Reconstruct canonical message string
  const message = constructAuthMessage(action, tradeId, timestamp);

  try {
    const isAuthentic = await verifyMessage({
      address: userAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isAuthentic) {
      return { isValid: false, error: 'Cryptographic signature verification failed.' };
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Signature verification error.' };
  }
}
