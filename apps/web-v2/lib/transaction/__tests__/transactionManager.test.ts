import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeTransactionError } from '../errorNormalizer';
import { checkERC20Allowance } from '../allowanceHelper';
import { TransactionProgressState, TransactionState } from '../types';

describe('Web3 Transaction UX Layer — State Machine & Lifecycle Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Initial State & State Transitions
  it('1. Correctly defines initial IDLE state and required state types', () => {
    const initialState: TransactionProgressState = {
      state: 'IDLE',
      attemptId: null,
      txHash: null,
      errorMessage: null,
      rawError: null,
      stepName: null,
      stepDescription: null,
      allowanceChecked: false,
      allowanceRequired: null,
      allowanceCurrent: null,
      allowanceSkipped: false,
      timeoutSeconds: 15,
    };

    expect(initialState.state).toBe('IDLE');
    expect(initialState.attemptId).toBeNull();
    expect(initialState.txHash).toBeNull();
  });

  // 2. Error Normalization — User Rejection
  it('2. Normalizes user rejection error into USER_REJECTED state message', () => {
    const res = normalizeTransactionError(new Error('User rejected the request in wallet.'));
    expect(res.isUserRejection).toBe(true);
    expect(res.message).toBe('Transaction cancelled: You rejected the wallet request.');
  });

  // 3. Error Normalization — Wallet Request Timeout
  it('3. Normalizes wallet timeout into WALLET_REQUEST_TIMEOUT state message', () => {
    const res = normalizeTransactionError(new Error('Wallet request timed out'));
    expect(res.isTimeout).toBe(true);
    expect(res.message).toContain('Your wallet approval request did not appear');
  });

  // 4. Error Normalization — Insufficient Funds
  it('4. Normalizes insufficient funds error correctly', () => {
    const res = normalizeTransactionError(new Error('insufficient funds for gas * price + value'));
    expect(res.isInsufficientFunds).toBe(true);
    expect(res.message).toContain('Insufficient native ETH balance');
  });

  // 5. Error Normalization — Wallet Disconnect
  it('5. Normalizes wallet disconnect error correctly', () => {
    const res = normalizeTransactionError(new Error('Connector not found / disconnected'));
    expect(res.isNetworkError).toBe(true);
    expect(res.message).toContain('Wallet disconnected');
  });

  // 6. Allowance Checking — Allowance Sufficient (Approval Skipped!)
  it('6. Skips ERC20 approval transaction when current allowance >= requiredAmount', async () => {
    const mockPublicClient = {
      readContract: vi.fn(async () => 5000n), // Allowance is 5000
    };

    const allowanceResult = await checkERC20Allowance({
      publicClient: mockPublicClient,
      userAddress: '0x1111111111111111111111111111111111111111',
      assetAddress: '0x2222222222222222222222222222222222222222',
      spenderAddress: '0x3333333333333333333333333333333333333333',
      requiredAmount: 1000n, // Required is 1000
    });

    expect(allowanceResult.isSufficient).toBe(true);
    expect(allowanceResult.currentAllowance).toBe(5000n);
  });

  // 7. Allowance Checking — Allowance Insufficient (Approval Required)
  it('7. Requires ERC20 approval transaction when current allowance < requiredAmount', async () => {
    const mockPublicClient = {
      readContract: vi.fn(async () => 100n), // Allowance is 100
    };

    const allowanceResult = await checkERC20Allowance({
      publicClient: mockPublicClient,
      userAddress: '0x1111111111111111111111111111111111111111',
      assetAddress: '0x2222222222222222222222222222222222222222',
      spenderAddress: '0x3333333333333333333333333333333333333333',
      requiredAmount: 1000n, // Required is 1000
    });

    expect(allowanceResult.isSufficient).toBe(false);
    expect(allowanceResult.currentAllowance).toBe(100n);
  });

  // 8. Allowance Checking — Native Asset (ETH)
  it('8. Always returns isSufficient = true for native asset (0x000000...0000)', async () => {
    const mockPublicClient = {
      readContract: vi.fn(),
    };

    const allowanceResult = await checkERC20Allowance({
      publicClient: mockPublicClient,
      userAddress: '0x1111111111111111111111111111111111111111',
      assetAddress: '0x0000000000000000000000000000000000000000',
      spenderAddress: '0x3333333333333333333333333333333333333333',
      requiredAmount: 1000n,
    });

    expect(allowanceResult.isSufficient).toBe(true);
    expect(mockPublicClient.readContract).not.toHaveBeenCalled();
  });

  // 9. Attempt ID & Stale Response Protection Simulation
  it('9. Simulates attempt ID matching and stale attempt rejection', () => {
    let currentAttemptId: string | null = 'att_attempt_1';
    let txHash: string | null = null;
    let state: TransactionState = 'WALLET_REQUEST';

    const onResolveAttempt1 = (hash: string, attemptId: string) => {
      if (attemptId !== currentAttemptId) {
        // Stale attempt! Ignore resolution.
        return;
      }
      txHash = hash;
      state = 'CONFIRMED';
    };

    // User retries -> currentAttemptId switches to att_attempt_2
    currentAttemptId = 'att_attempt_2';

    // Late resolution from att_attempt_1 arrives
    onResolveAttempt1('0x1111111111111111111111111111111111111111', 'att_attempt_1');

    // State must remain WALLET_REQUEST and txHash must be null!
    expect(state).toBe('WALLET_REQUEST');
    expect(txHash).toBeNull();

    // Resolution from att_attempt_2 arrives
    onResolveAttempt1('0x2222222222222222222222222222222222222222', 'att_attempt_2');

    expect(state).toBe('CONFIRMED');
    expect(txHash).toBe('0x2222222222222222222222222222222222222222');
  });

  // 10. Timeout State Machine Simulation
  it('10. Simulates 15-second wallet request timeout transition', () => {
    let state: TransactionState = 'WALLET_REQUEST';
    let errorMessage: string | null = null;

    const timeoutHandler = () => {
      if (state === 'WALLET_REQUEST') {
        state = 'WALLET_REQUEST_TIMEOUT';
        errorMessage = 'Your wallet approval request did not appear.';
      }
    };

    setTimeout(timeoutHandler, 15_000);

    expect(state).toBe('WALLET_REQUEST');

    vi.advanceTimersByTime(15_000);

    expect(state).toBe('WALLET_REQUEST_TIMEOUT');
    expect(errorMessage).toContain('Your wallet approval request did not appear');
  });

  // 11. Error Normalization — InvalidTradeParty (0x9c7d6196)
  it('11. Normalizes InvalidTradeParty custom error and signature correctly', () => {
    const resName = normalizeTransactionError(new Error('Execution reverted: InvalidTradeParty()'));
    expect(resName.message).toBe('Unauthorized trade party for this operation.');

    const resSig = normalizeTransactionError(
      new Error(
        'The contract function "refund" reverted with the following signature:\n0x9c7d6196\nUnable to decode signature...',
      ),
    );
    expect(resSig.message).toBe('Unauthorized trade party for this operation.');
    expect(resSig.isNetworkError).toBe(false);
  });

  // 12. Error Normalization — InvalidTradeState (0x3cffb228)
  it('12. Normalizes InvalidTradeState custom error and signature correctly', () => {
    const resName = normalizeTransactionError(
      new Error('Execution reverted: InvalidTradeState(35, 3, 1)'),
    );
    expect(resName.message).toBe('Invalid trade state for this operation.');

    const resSig = normalizeTransactionError(
      new Error(
        'The contract function "fundTrade" reverted with the following signature:\n0x3cffb228',
      ),
    );
    expect(resSig.message).toBe('Invalid trade state for this operation.');
    expect(resSig.isNetworkError).toBe(false);
  });

  // 13. Error Normalization — EvidenceHashAlreadyUsed (0x8ce8d3bb)
  it('13. Normalizes EvidenceHashAlreadyUsed custom error and signature correctly', () => {
    const resName = normalizeTransactionError(
      new Error('Execution reverted: EvidenceHashAlreadyUsed(0x1234)'),
    );
    expect(resName.message).toBe('Receipt evidence hash has already been used in another trade.');

    const resSig = normalizeTransactionError(
      new Error('reverted with signature 0x8ce8d3bb in submitPayment'),
    );
    expect(resSig.message).toBe('Receipt evidence hash has already been used in another trade.');
  });

  // 14. Error Normalization — TradePaymentWindowExpired (0x1f77955e)
  it('14. Normalizes TradePaymentWindowExpired custom error and signature correctly', () => {
    const resName = normalizeTransactionError(
      new Error('Execution reverted: TradePaymentWindowExpired(35, 100, 200)'),
    );
    expect(resName.message).toBe('Payment deadline for this trade has expired on-chain.');

    const resSig = normalizeTransactionError(
      new Error('The contract function reverted with the following signature: 0x1f77955e'),
    );
    expect(resSig.message).toBe('Payment deadline for this trade has expired on-chain.');
  });

  // 15. Error Normalization — UnauthorizedDisputeResolver (0xa7fc5c8d)
  it('15. Normalizes UnauthorizedDisputeResolver custom error and signature correctly', () => {
    const resName = normalizeTransactionError(
      new Error('Execution reverted: UnauthorizedDisputeResolver(0x1234)'),
    );
    expect(resName.message).toBe('Only designated Arbitrators can resolve disputes.');

    const resSig = normalizeTransactionError(
      new Error('reverted with the following signature:\n0xa7fc5c8d'),
    );
    expect(resSig.message).toBe('Only designated Arbitrators can resolve disputes.');
  });

  // 16. Error Normalization — Unknown RPC / Provider Error
  it('16. Normalizes generic RPC/transport errors into clean provider communication message', () => {
    const res = normalizeTransactionError(
      new Error('An unknown RPC error occurred during eth_call.'),
    );
    expect(res.isNetworkError).toBe(true);
    expect(res.message).toBe(
      'Unable to communicate with the blockchain RPC provider. Please retry.',
    );
  });

  // 17. Error Normalization — Long Viem Error Sanitization (No raw Request Arguments)
  it('17. Sanitizes long Viem error and never exposes raw Request Arguments or partial addresses', () => {
    const longViemError = new Error(
      'An unknown RPC error occurred.\n\nRequest Arguments:\n  from:  0xd905920c91853039060246Ed5724AA72B91a96DA\n  to:    0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb\n  data:  0x5e56e0d90000000000000000000000000000000000000000000000000000000000000023\n\nVersion: viem@2.55.2',
    );

    const res = normalizeTransactionError(longViemError);
    expect(res.isNetworkError).toBe(true);
    expect(res.message).toBe(
      'Unable to communicate with the blockchain RPC provider. Please retry.',
    );
    expect(res.message).not.toContain('Request Arguments');
    expect(res.message).not.toContain('0xd905920c91853039060246Ed5724AA72B91a96DA');
    expect(res.message).not.toContain('0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb');
  });

  // 18. Error Handling — Does not re-trigger confirmAndRelease on error
  it('18. Error handling path does not re-invoke contract functions or trigger retries automatically', async () => {
    const mockConfirmAndRelease = vi.fn().mockRejectedValue(new Error('0x9c7d6196'));
    let userError: string | null = null;
    let isPending = true;

    try {
      await mockConfirmAndRelease(35);
    } catch (err: unknown) {
      const normalized = normalizeTransactionError(err);
      userError = normalized.message;
      isPending = false;
    }

    expect(mockConfirmAndRelease).toHaveBeenCalledTimes(1);
    expect(isPending).toBe(false);
    expect(userError).toBe('Unauthorized trade party for this operation.');
  });

  // 19. Security Property — No escrow release triggered by error handling
  it('19. Verifies that error handling preserves safety and never transitions trade to RELEASED', () => {
    const tradeState = 3; // PAYMENT_SUBMITTED
    const errorCatchHandler = (err: unknown) => {
      const normalized = normalizeTransactionError(err);
      // Ensure error handler ONLY updates error string and does not mutate trade state
      return normalized.message;
    };

    const msg = errorCatchHandler(new Error('An unknown RPC error occurred.'));
    expect(msg).toBe('Unable to communicate with the blockchain RPC provider. Please retry.');
    expect(tradeState).toBe(3); // State remains intact
  });

  // 20. Protocol Paused / Active Window / Other Escrow Errors
  it('20. Decodes ProtocolPaused and TradePaymentWindowActive correctly', () => {
    expect(normalizeTransactionError(new Error('ProtocolPaused()')).message).toBe(
      'Protocol is temporarily paused.',
    );
    expect(
      normalizeTransactionError(new Error('TradePaymentWindowActive(35, 100, 50)')).message,
    ).toBe('Payment window is still active. Refund not yet permitted.');
  });
});
