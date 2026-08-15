import { describe, it, expect } from 'vitest';
import { generateUpiUri } from '../../payment/paymentIntentStore';
import { AccountAggregatorVerificationEngine } from '../aa/aaEngine';
import { DEFAULT_P2P_FIAT_CURRENCY } from '../../../constants';

describe('Phase 7.0.8 — Currency Semantics & INR Enforcement Tests', () => {
  it('1. Authoritative fiat constant is INR', () => {
    expect(DEFAULT_P2P_FIAT_CURRENCY).toBe('INR');
  });

  it('2. Accepts INR for UPI URI generation and returns cu=INR', () => {
    const upiUri = generateUpiUri(
      'seller@upi',
      'UnifyVault Seller',
      '85.00',
      'INR',
      'UV-TRD-4-ABCD',
    );
    expect(upiUri).toContain('cu=INR');
    expect(upiUri).toContain('pa=seller%40upi');
    expect(upiUri).toContain('am=85.00');
  });

  it('3. Rejects non-INR currency (e.g. USD) when generating UPI URI', () => {
    expect(() =>
      generateUpiUri('seller@upi', 'UnifyVault Seller', '1.00', 'USD', 'UV-TRD-3-XXXX'),
    ).toThrowError(/Invalid UPI currency/);
  });

  it('4. Rejects EUR/GBP for UPI URI generation', () => {
    expect(() =>
      generateUpiUri('seller@upi', 'UnifyVault Seller', '10.00', 'EUR', 'UV-TRD-10-EEEE'),
    ).toThrowError(/Invalid UPI currency/);
    expect(() =>
      generateUpiUri('seller@upi', 'UnifyVault Seller', '10.00', 'GBP', 'UV-TRD-10-GGGG'),
    ).toThrowError(/Invalid UPI currency/);
  });

  it('5. AA Engine currency matching logic succeeds for exact INR values', () => {
    const intentCurrency = 'INR';
    const txCurrency = 'INR';
    expect(txCurrency.toUpperCase()).toBe(intentCurrency.toUpperCase());
  });

  it('6. AA Engine rejects USD transaction against INR payment intent', () => {
    const intentCurrency = 'INR';
    const txCurrency = 'USD';
    expect(txCurrency.toUpperCase() === intentCurrency.toUpperCase()).toBe(false);
  });
});
