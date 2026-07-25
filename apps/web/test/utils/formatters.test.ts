import { describe, it, expect } from 'vitest';
import { parseWalletError } from '../../lib/utils/formatters';

describe('parseWalletError', () => {
  it('extracts Solidity revert reason from cause.reason', () => {
    const error = {
      cause: {
        reason: 'ERC20: transfer amount exceeds allowance',
      },
    };
    expect(parseWalletError(error)).toBe('ERC20: transfer amount exceeds allowance');
  });

  it('extracts custom error name from cause.data.errorName', () => {
    const error = {
      cause: {
        data: {
          errorName: 'SlippageLimitExceeded',
        },
      },
    };
    expect(parseWalletError(error)).toBe('SlippageLimitExceeded');
  });

  it('extracts revert reason via viem walk() method', () => {
    const error = {
      walk: (fn?: (e: any) => boolean) => {
        const item = { reason: 'ERC20: transfer amount exceeds allowance' };
        if (fn && fn(item)) return item;
        return undefined;
      },
    };
    expect(parseWalletError(error)).toBe('ERC20: transfer amount exceeds allowance');
  });

  it('extracts revert reason from shortMessage regex pattern', () => {
    const error = {
      shortMessage: 'Execution reverted with reason: ERC20: transfer amount exceeds allowance',
    };
    expect(parseWalletError(error)).toBe('ERC20: transfer amount exceeds allowance');
  });

  it('falls back to shortMessage when no specific pattern matches', () => {
    const error = {
      shortMessage: 'Contract call failed',
    };
    expect(parseWalletError(error)).toBe('Contract call failed');
  });

  it('handles user rejected errors correctly', () => {
    const error = {
      code: 4001,
      message: 'User rejected the transaction',
    };
    expect(parseWalletError(error)).toBe('Connection request was rejected by the user.');
  });
});
