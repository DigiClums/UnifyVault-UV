import { describe, it, expect } from 'vitest';
import { validateUpiId } from '../../../lib/p2p/upiValidation';

/**
 * Pure Validation & Calculation Helper Functions matching CreateMarketplaceOrderModal.tsx logic
 */
export function computeProgressiveValidationError(params: {
  priceStr: string;
  amountStr: string;
  minLimitStr: string;
  maxLimitStr: string;
  side?: 'BUY' | 'SELL';
  sellerUpiStr?: string;
}): string | null {
  const priceNum = params.priceStr ? parseFloat(params.priceStr) : 0;
  const amountNum = params.amountStr ? parseFloat(params.amountStr) : 0;
  const minLimitNum = params.minLimitStr ? parseFloat(params.minLimitStr) : 0;
  const maxLimitNum = params.maxLimitStr ? parseFloat(params.maxLimitStr) : amountNum;

  if (params.priceStr && (isNaN(priceNum) || priceNum <= 0)) {
    return 'Please enter a valid unit price greater than 0.';
  }

  if (params.amountStr && (isNaN(amountNum) || amountNum <= 0)) {
    return 'Please enter a valid total order amount greater than 0.';
  }

  if (params.side === 'SELL') {
    const upiRes = validateUpiId(params.sellerUpiStr);
    if (!upiRes.isValid) {
      return upiRes.error || 'Seller UPI ID is required.';
    }
  }

  if (amountNum > 0) {
    if (params.minLimitStr && (isNaN(minLimitNum) || minLimitNum <= 0)) {
      return 'Minimum limit must be greater than 0.';
    }

    if (params.maxLimitStr && (isNaN(maxLimitNum) || maxLimitNum <= 0)) {
      return 'Maximum limit must be greater than 0.';
    }

    if (params.minLimitStr && minLimitNum > amountNum) {
      return `Minimum limit (${minLimitNum}) cannot exceed total order amount (${amountNum}).`;
    }

    if (params.maxLimitStr && maxLimitNum > amountNum) {
      return `Maximum limit (${maxLimitNum}) cannot exceed total order amount (${amountNum}).`;
    }

    if (params.minLimitStr && params.maxLimitStr && minLimitNum > maxLimitNum) {
      return `Minimum limit (${minLimitNum}) cannot exceed maximum limit (${maxLimitNum}).`;
    }
  }

  return null;
}

export function calculateOrderSummary(priceNum: number, amountNum: number) {
  const totalValueINR = priceNum > 0 && amountNum > 0 ? priceNum * amountNum : 0;
  return {
    priceNum,
    amountNum,
    totalValueINR,
  };
}

export function shouldDisplaySellBalanceBox(side: 'BUY' | 'SELL'): boolean {
  return side === 'SELL';
}

export function shouldDisplaySellerUpiField(side: 'BUY' | 'SELL'): boolean {
  return side === 'SELL';
}

export function isSubmitDisabledForState(params: {
  side: 'BUY' | 'SELL';
  priceNum: number;
  amountNum: number;
  hasValidationError: boolean;
  isSubmitting: boolean;
  isBalanceLoading: boolean;
  isInsufficientBalance: boolean;
  canSubmitSellOrder: boolean;
  isWrongNetwork: boolean;
  sellerUpiStr?: string;
}): boolean {
  if (params.isSubmitting) return true;
  if (params.isWrongNetwork) return true;
  if (!params.priceNum || params.priceNum <= 0) return true;
  if (!params.amountNum || params.amountNum <= 0) return true;
  if (params.hasValidationError) return true;

  if (params.side === 'SELL') {
    if (params.isBalanceLoading) return true;
    if (params.isInsufficientBalance) return true;
    if (!params.canSubmitSellOrder) return true;
    if (!validateUpiId(params.sellerUpiStr).isValid) return true;
  }

  return false;
}

describe('Phase 7.3 — Create Marketplace Order Modal UX & Validation Suite', () => {
  // 1. Empty total amount
  it('1. Empty total order amount produces NO premature minimum limit error', () => {
    const err = computeProgressiveValidationError({
      priceStr: '500',
      amountStr: '',
      minLimitStr: '10',
      maxLimitStr: '50',
    });
    expect(err).toBeNull();
  });

  // 2. Valid total + invalid min (min > total)
  it('2. Valid total amount + min limit > total amount triggers progressive error', () => {
    const err = computeProgressiveValidationError({
      priceStr: '500',
      amountStr: '50',
      minLimitStr: '100', // min > total
      maxLimitStr: '',
    });
    expect(err).toContain('Minimum limit (100) cannot exceed total order amount (50)');
  });

  // 3. Min > Max
  it('3. Min limit > Max limit triggers progressive error', () => {
    const err = computeProgressiveValidationError({
      priceStr: '500',
      amountStr: '100',
      minLimitStr: '50',
      maxLimitStr: '20', // min > max
    });
    expect(err).toContain('Minimum limit (50) cannot exceed maximum limit (20)');
  });

  // 4. Max > Total
  it('4. Max limit > Total order amount triggers progressive error', () => {
    const err = computeProgressiveValidationError({
      priceStr: '500',
      amountStr: '100',
      minLimitStr: '10',
      maxLimitStr: '200', // max > total
    });
    expect(err).toContain('Maximum limit (200) cannot exceed total order amount (100)');
  });

  // 5. Valid partial-fill range
  it('5. Valid partial-fill range (min <= max <= total) produces zero validation errors', () => {
    const err = computeProgressiveValidationError({
      priceStr: '500',
      amountStr: '100',
      minLimitStr: '10',
      maxLimitStr: '100',
    });
    expect(err).toBeNull();
  });

  // 6. BUY vs SELL UI behavior
  it('6. BUY mode hides SELL balance preflight box while SELL mode displays it', () => {
    expect(shouldDisplaySellBalanceBox('BUY')).toBe(false);
    expect(shouldDisplaySellBalanceBox('SELL')).toBe(true);
  });

  // 7. Live Order Summary Calculation
  it('7. Calculates live order value accurately (unit price * total amount)', () => {
    const summary = calculateOrderSummary(500, 100);
    expect(summary.totalValueINR).toBe(50000);
  });

  // 8. Existing SELL Balance Hard-Block
  it('8. Insufficient SELL balance hard-disables order submission button', () => {
    const isDisabled = isSubmitDisabledForState({
      side: 'SELL',
      priceNum: 500,
      amountNum: 100,
      hasValidationError: false,
      isSubmitting: false,
      isBalanceLoading: false,
      isInsufficientBalance: true, // Insufficient balance
      canSubmitSellOrder: false,
      isWrongNetwork: false,
      sellerUpiStr: 'alice@okaxis',
    });
    expect(isDisabled).toBe(true);
  });

  // 9. Seller UPI ID Validation & Visibility
  it('9. BUY UVBE flow does NOT require or display Seller UPI ID', () => {
    expect(shouldDisplaySellerUpiField('BUY')).toBe(false);

    // BUY order with empty sellerUpiStr has no validation error
    const err = computeProgressiveValidationError({
      side: 'BUY',
      priceStr: '500',
      amountStr: '100',
      minLimitStr: '10',
      maxLimitStr: '100',
      sellerUpiStr: '',
    });
    expect(err).toBeNull();

    const isDisabled = isSubmitDisabledForState({
      side: 'BUY',
      priceNum: 500,
      amountNum: 100,
      hasValidationError: false,
      isSubmitting: false,
      isBalanceLoading: false,
      isInsufficientBalance: false,
      canSubmitSellOrder: false,
      isWrongNetwork: false,
      sellerUpiStr: '',
    });
    expect(isDisabled).toBe(false);
  });

  it('10. SELL UVBE flow requires Seller UPI ID and displays field', () => {
    expect(shouldDisplaySellerUpiField('SELL')).toBe(true);

    // Empty UPI ID in SELL mode triggers validation error
    const emptyErr = computeProgressiveValidationError({
      side: 'SELL',
      priceStr: '500',
      amountStr: '100',
      minLimitStr: '10',
      maxLimitStr: '100',
      sellerUpiStr: '',
    });
    expect(emptyErr).toBe('Seller UPI ID is required.');

    // Submission is disabled when UPI ID is empty in SELL mode
    const isDisabled = isSubmitDisabledForState({
      side: 'SELL',
      priceNum: 500,
      amountNum: 100,
      hasValidationError: false,
      isSubmitting: false,
      isBalanceLoading: false,
      isInsufficientBalance: false,
      canSubmitSellOrder: true,
      isWrongNetwork: false,
      sellerUpiStr: '',
    });
    expect(isDisabled).toBe(true);
  });

  it('11. Valid Seller UPI ID is accepted (including trimmed whitespace)', () => {
    const validUpiCases = [
      'name@upi',
      'alice@okaxis',
      'seller.pay@okhdfcbank',
      'trader_123@icici',
      '  valid.seller@paytm  ',
    ];

    for (const upi of validUpiCases) {
      const err = computeProgressiveValidationError({
        side: 'SELL',
        priceStr: '500',
        amountStr: '100',
        minLimitStr: '10',
        maxLimitStr: '100',
        sellerUpiStr: upi,
      });
      expect(err).toBeNull();

      const isDisabled = isSubmitDisabledForState({
        side: 'SELL',
        priceNum: 500,
        amountNum: 100,
        hasValidationError: false,
        isSubmitting: false,
        isBalanceLoading: false,
        isInsufficientBalance: false,
        canSubmitSellOrder: true,
        isWrongNetwork: false,
        sellerUpiStr: upi,
      });
      expect(isDisabled).toBe(false);
    }
  });

  it('12. Invalid Seller UPI ID is rejected (spaces, missing parts, bad format)', () => {
    const invalidCases = [
      { upi: 'name upi', expectedErr: 'UPI ID cannot contain spaces.' },
      { upi: 'name @upi', expectedErr: 'UPI ID cannot contain spaces.' },
      { upi: 'name@ upi', expectedErr: 'UPI ID cannot contain spaces.' },
      { upi: 'nameupi', expectedErr: 'Invalid UPI ID format. Expected format: name@upi' },
      { upi: '@upi', expectedErr: 'Invalid UPI ID format. Expected format: name@upi' },
      { upi: 'name@', expectedErr: 'Invalid UPI ID format. Expected format: name@upi' },
      { upi: 'name@@upi', expectedErr: 'Invalid UPI ID format. Expected format: name@upi' },
      { upi: 'name@upi@provider', expectedErr: 'Invalid UPI ID format. Expected format: name@upi' },
    ];

    for (const { upi, expectedErr } of invalidCases) {
      const err = computeProgressiveValidationError({
        side: 'SELL',
        priceStr: '500',
        amountStr: '100',
        minLimitStr: '10',
        maxLimitStr: '100',
        sellerUpiStr: upi,
      });
      expect(err).toBe(expectedErr);

      const isDisabled = isSubmitDisabledForState({
        side: 'SELL',
        priceNum: 500,
        amountNum: 100,
        hasValidationError: true,
        isSubmitting: false,
        isBalanceLoading: false,
        isInsufficientBalance: false,
        canSubmitSellOrder: true,
        isWrongNetwork: false,
        sellerUpiStr: upi,
      });
      expect(isDisabled).toBe(true);
    }
  });
});
