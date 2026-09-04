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

  // 1. User Rejection
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

  // 2. Wallet Request Timeout
  if (
    lower.includes('request not received') ||
    lower.includes('wallet_request_timeout') ||
    (lower.includes('timed out') && !lower.includes('receipt')) ||
    (lower.includes('timeout') && !lower.includes('receipt'))
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

  // 3. Insufficient Funds / Gas
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

  // 4. Specific Escrow Custom Revert Reasons & Signatures (Checked BEFORE generic RPC errors)
  if (lower.includes('invalidtradeparty') || lower.includes('0x9c7d6196')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Unauthorized trade party for this operation.',
    };
  }

  if (lower.includes('invalidtradestate') || lower.includes('0x3cffb228')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Invalid trade state for this operation.',
    };
  }

  if (lower.includes('evidencehashalreadyused') || lower.includes('0x8ce8d3bb')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Receipt evidence hash has already been used in another trade.',
    };
  }

  if (lower.includes('tradepaymentwindowexpired') || lower.includes('0x1f77955e')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Payment deadline for this trade has expired on-chain.',
    };
  }

  if (lower.includes('tradepaymentwindowactive') || lower.includes('0x83d5c83a')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Payment window is still active. Refund not yet permitted.',
    };
  }

  if (lower.includes('unauthorizeddisputeresolver') || lower.includes('0xa7fc5c8d')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Only designated Arbitrators can resolve disputes.',
    };
  }

  if (lower.includes('tradedoesnotexist') || lower.includes('0x3a57ddc0')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Trade does not exist on-chain.',
    };
  }

  if (lower.includes('paymentreferencealreadyused') || lower.includes('0x0cb8d22d')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Payment reference has already been used in another trade.',
    };
  }

  if (lower.includes('invalidevidencehash') || lower.includes('0xee4b1fae')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Invalid receipt evidence hash provided.',
    };
  }

  if (lower.includes('invalidpaymentreference') || lower.includes('0xaf3a12f8')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Invalid payment reference provided.',
    };
  }

  if (lower.includes('minimumpaymentwindownotmet') || lower.includes('0x86dc9d88')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Minimum payment window requirement not met.',
    };
  }

  if (lower.includes('tradealreadyfunded') || lower.includes('0x8f0f8fad')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Trade is already funded on-chain.',
    };
  }

  if (lower.includes('tradenotfunded') || lower.includes('0x54856ca8')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Trade has not been funded yet.',
    };
  }

  if (lower.includes('protocolpaused') || lower.includes('0x44279255')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Protocol is temporarily paused.',
    };
  }

  if (lower.includes('feeexceedsmaximum') || lower.includes('0x0dd992ac')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Fee exceeds protocol maximum.',
    };
  }

  if (lower.includes('incorrectnativeamount') || lower.includes('0x5693fffb')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Incorrect native ETH amount provided.',
    };
  }

  if (lower.includes('transferexecutionfailed')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Token transfer failed on-chain.',
    };
  }

  // 4b. Staking Subsystem Custom Errors
  if (lower.includes('belowminstake') || lower.includes('0x9be9d80a')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Minimum stake is 50 UVBE.',
    };
  }

  if (lower.includes('exceedsmaxstake') || lower.includes('0xdc0b21db')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Maximum stake is 100,000 UVBE per transaction.',
    };
  }

  if (lower.includes('circularreferraldetected') || lower.includes('0x755d2a4c')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Circular referral loop detected.',
    };
  }

  if (lower.includes('selfreferralprohibited') || lower.includes('0xc1e46186')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: false,
      isInsufficientFunds: false,
      message: 'Self-referral is prohibited.',
    };
  }

  // 5. Wallet Disconnect / Network Mismatch
  if (lower.includes('disconnected') || lower.includes('connector not found')) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: true,
      isInsufficientFunds: false,
      message: 'Wallet disconnected. Please reconnect your wallet.',
    };
  }

  if (
    lower.includes('network mismatch') ||
    lower.includes('chain mismatch') ||
    lower.includes('wrong network')
  ) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: true,
      isInsufficientFunds: false,
      message: 'Network mismatch. Please switch to Base Mainnet (Chain ID 8453).',
    };
  }

  // 6. Generic RPC / Transport / Provider Failure
  if (
    lower.includes('unknown rpc error') ||
    lower.includes('rpc request failed') ||
    lower.includes('rpc error') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('request arguments:') ||
    lower.includes('request body:') ||
    lower.includes('econnrefused')
  ) {
    return {
      isUserRejection: false,
      isTimeout: false,
      isNetworkError: true,
      isInsufficientFunds: false,
      message: 'Unable to communicate with the blockchain RPC provider. Please retry.',
    };
  }

  // 7. Clean Fallback for other errors
  const cleanMessage = rawMessage
    .replace(/^Error:\s*/i, '')
    .replace(/Execut(?:ed|ion) reverted:\s*/i, '')
    .replace(/^ContractFunctionExecutionError:\s*/i, '')
    .split('\n')[0]
    .trim();

  return {
    isUserRejection: false,
    isTimeout: false,
    isNetworkError: false,
    isInsufficientFunds: false,
    message: cleanMessage || 'Transaction execution failed on-chain.',
  };
}
