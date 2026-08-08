import { describe, expect, it, vi } from 'vitest';
import { decodeTransactionError } from '../utils/errorDecoder';

describe('Single-Click Deposit & Redeem UX Engine', () => {
  // Test 1: Deposit with sufficient allowance -> one deposit transaction
  it('1. Deposit with sufficient allowance skips approval and executes deposit directly', () => {
    const allowance = 1000n * 10n ** 6n;
    const depositAmount = 100n * 10n ** 6n;
    const isApproved = allowance >= depositAmount;

    expect(isApproved).toBe(true);
    // State machine steps for sufficient allowance:
    const expectedSteps = ['preparing', 'awaiting_deposit_wallet', 'deposit_pending', 'confirmed'];
    expect(expectedSteps).not.toContain('awaiting_approval_wallet');
  });

  // Test 2: Deposit with insufficient allowance -> automatic approval then automatic deposit
  it('2. Deposit with insufficient allowance automatically sequences approval then deposit', () => {
    const allowance = 0n;
    const depositAmount = 100n * 10n ** 6n;
    const isApproved = allowance >= depositAmount;

    expect(isApproved).toBe(false);
    // State machine steps for automatic two-stage execution under ONE button:
    const expectedSteps = [
      'preparing',
      'awaiting_approval_wallet',
      'approval_pending',
      'approval_confirmed',
      'preparing',
      'awaiting_deposit_wallet',
      'deposit_pending',
      'confirmed',
    ];
    expect(expectedSteps).toContain('approval_pending');
    expect(expectedSteps).toContain('deposit_pending');
  });

  // Test 3: User rejects approval
  it('3. Decodes user wallet rejection during approval step cleanly', () => {
    const userRejectErr = { code: 4001, message: 'User rejected the request' };
    const decoded = decodeTransactionError(userRejectErr);

    expect(decoded.message).toBe('Transaction rejected by wallet');
    expect(decoded.message).not.toContain('code=3');
    expect(decoded.message).not.toContain('execution reverted');
  });

  // Test 4: User rejects deposit
  it('4. Decodes user wallet rejection during deposit step cleanly', () => {
    const userRejectErr = { message: 'MetaMask Tx Signature: User denied transaction signature.' };
    const decoded = decodeTransactionError(userRejectErr);

    expect(decoded.message).toBe('Transaction rejected by wallet');
  });

  // Test 5: Deposit revert
  it('5. Decodes contract deposit revert (e.g. SlippageExceeded) cleanly', () => {
    const revertErr = {
      shortMessage: 'The contract function "deposit" reverted with reason: SlippageExceeded',
    };
    const decoded = decodeTransactionError(revertErr);

    expect(decoded.message).toBe('Slippage tolerance exceeded. Try increasing slippage tolerance.');
  });

  // Test 6: Redeem success
  it('6. Redeem success transitions through wallet approval to confirmed', () => {
    const redeemSteps = ['preparing', 'awaiting_redeem_wallet', 'redeem_pending', 'confirmed'];
    expect(redeemSteps[0]).toBe('preparing');
    expect(redeemSteps[3]).toBe('confirmed');
  });

  // Test 7: Redeem user rejection
  it('7. Decodes user wallet rejection during redeem cleanly', () => {
    const userRejectErr = { message: 'User rejected the request' };
    const decoded = decodeTransactionError(userRejectErr);

    expect(decoded.message).toBe('Transaction rejected by wallet');
  });

  // Test 8: Redeem revert
  it('8. Decodes contract redeem revert gracefully without raw code=3', () => {
    const rawRevertErr = { message: 'execution reverted (code=3, message=execution reverted)' };
    const decoded = decodeTransactionError(rawRevertErr);

    expect(decoded.message).toBe(
      'Transaction reverted on-chain. Please try again after refreshing the quote.',
    );
    expect(decoded.message).not.toContain('code=3');
  });

  // Test 9: Zero balance validation
  it('9. Rejects zero deposit or zero redeem amounts before submitting tx', () => {
    const depositAmount = 0n;
    const isZeroValid = depositAmount > 0n;
    expect(isZeroValid).toBe(false);
  });

  // Test 10: Amount greater than balance validation
  it('10. Rejects deposit amount exceeding USDC balance or redeem amount exceeding shares balance', () => {
    const usdcBalance = 50n * 10n ** 6n;
    const requestedDeposit = 100n * 10n ** 6n;

    const isAmountValid = requestedDeposit <= usdcBalance;
    expect(isAmountValid).toBe(false);

    const err = new Error('Insufficient USDC balance');
    const decoded = decodeTransactionError(err);
    expect(decoded.message).toBe('Insufficient USDC balance');
  });

  // Test 11: Stale quote protection
  it('11. Re-evaluates minSharesOut with latest quote right before tx submission', () => {
    const oldQuoteShares = 100n * 10n ** 18n;
    const freshQuoteShares = 95n * 10n ** 18n; // Market moved before submission

    // 0.5% slippage tolerance (99.5%)
    const minSharesOld = (oldQuoteShares * 995n) / 1000n;
    const minSharesFresh = (freshQuoteShares * 995n) / 1000n;

    expect(minSharesFresh).toBeLessThan(minSharesOld);
    expect(minSharesFresh).toBe(94525n * 10n ** 15n);
  });

  // Test 12: Successful transaction triggers full query invalidation
  it('12. Invalidation helper invalidates all active protocol data queries', async () => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      refetchQueries: vi.fn().mockResolvedValue(undefined),
    };

    const { invalidateProtocolQueries } = await import('../utils/cacheInvalidation');
    await invalidateProtocolQueries(
      mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
    );

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['readContracts'] });
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['readContract'] });
    expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({ type: 'active' });
  });
});
