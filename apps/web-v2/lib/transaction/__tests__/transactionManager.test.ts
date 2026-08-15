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
});
