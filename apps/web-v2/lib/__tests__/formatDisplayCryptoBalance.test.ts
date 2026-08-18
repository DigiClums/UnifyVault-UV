import { describe, it, expect } from 'vitest';
import { formatDisplayCryptoBalance } from '../math/format';

describe('formatDisplayCryptoBalance presentation tests', () => {
  it('formats long decimal ETH balances cleanly without altering underlying value', () => {
    expect(formatDisplayCryptoBalance('0.001883949349109012 ETH')).toBe('0.001884 ETH');
    expect(formatDisplayCryptoBalance('0.001883949349109012', 'ETH')).toBe('0.001884 ETH');
  });

  it('formats zero balances accurately', () => {
    expect(formatDisplayCryptoBalance('0', 'ETH')).toBe('0.0000 ETH');
    expect(formatDisplayCryptoBalance('0.0000', 'BTC')).toBe('0.0000 BTC');
    expect(formatDisplayCryptoBalance('0', 'USDC')).toBe('0.00 USDC');
  });

  it('formats USDC stablecoin amounts with commas and 2 decimals', () => {
    expect(formatDisplayCryptoBalance('1250.500000 USDC')).toBe('1,250.50 USDC');
    expect(formatDisplayCryptoBalance('1000000.00', 'USDC')).toBe('1,000,000.00 USDC');
  });

  it('formats BTC balances with standard precision', () => {
    expect(formatDisplayCryptoBalance('0.12345678 BTC')).toBe('0.123457 BTC');
    expect(formatDisplayCryptoBalance('1.50000000', 'BTC')).toBe('1.5000 BTC');
    expect(formatDisplayCryptoBalance('1234.5678', 'BTC')).toBe('1,234.57 BTC');
  });

  it('formats sub-micro dust balances cleanly', () => {
    expect(formatDisplayCryptoBalance('0.000000123 ETH')).toBe('< 0.000001 ETH');
  });

  it('handles null / undefined / empty values gracefully', () => {
    expect(formatDisplayCryptoBalance('', 'ETH')).toBe('0.0000 ETH');
    // @ts-expect-error test undefined
    expect(formatDisplayCryptoBalance(undefined, 'BTC')).toBe('0.0000 BTC');
  });
});
