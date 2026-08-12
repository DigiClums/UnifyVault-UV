/**
 * Normalizes raw RPC/viem/wagmi error objects into clean, user-friendly error messages.
 */
export function normalizeTransactionError(err: unknown): {
  isUserRejection: boolean;
  isTimeout: boolean;
  isNetworkError: boolean;
  isInsufficientFunds: boolean;
  message: string;
} {
  if (!err) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'An unknown error occurred during transaction execution.',
    };
  }

  const rawMessage =
    typeof err === 'string'
      ? err
      : (err as { shortMessage?: string; message?: string })?.shortMessage ||
        (err as { message?: string })?.message ||
        String(err);

  const lower = rawMessage.toLowerCase();

  // User Rejection
  if (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('rejected the request') ||
    lower.includes('action_rejected')
  ) {
    return {
      isUserRejection: true,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Transaction cancelled: You rejected the wallet request.',
    };
  }

  // Wallet Request Timeout
  if (
    lower.includes('request not received') ||
    lower.includes('wallet_request_timeout') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return {
      isUserRejection: false,
      isTimeout: true,
      isNetworkError: false,
      isInsufficientFunds: false,
      message:
        'Your wallet approval request did not appear. This can happen when the connection is slow or the wallet is temporarily unavailable.',
    };
  }

  // Insufficient Funds / Gas
  if (
    lower.includes('insufficient funds') ||
    lower.includes('exceeds balance') ||
    lower.includes('insufficient eth') ||
    lower.includes('gas required exceeds allowance')
  ) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: true,
      message: 'Insufficient native ETH balance to cover network gas fees.',
    };
  }

  // Network / Disconnected Error
  if (
    lower.includes('disconnected') ||
    lower.includes('connector not found') ||
    lower.includes('network mismatch') ||
    lower.includes('chain mismatch') ||
    lower.includes('wrong network') ||
    lower.includes('rpc error') ||
    lower.includes('failed to fetch')
  ) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: true,
      isInsufficientFunds: false,
      message: 'Wallet disconnected or RPC network connection failed. Please check network.',
    };
  }

  // Specific Escrow Revert Reasons
  if (lower.includes('tradepaymentwindowexpired')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Payment deadline for this trade has expired on-chain.',
    };
  }

  if (lower.includes('evidencehashalreadyused')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Receipt evidence hash has already been used in another trade.',
    };
  }

  if (lower.includes('invalidtradestate')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Invalid trade state for this operation.',
    };
  }

  if (lower.includes('unauthorizeddisputeresolver')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Only designated Arbitrators can resolve disputes.',
    };
  }

  // Clean fallback message
  const cleanMessage = rawMessage
    .replace(/^Error:\s*/i, '')
    .replace(/Execut(?:ed|ion) reverted:\s*/i, '')
    .slice(0, 180);

  return {
    isUserRejection: false,
    isTimeout: false,
    isNetworkError: false,
    isInsufficientFunds: false,
    message: cleanMessage || 'Transaction execution failed on-chain.',
  };
}
