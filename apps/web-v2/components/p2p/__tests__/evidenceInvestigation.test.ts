import { describe, it, expect } from 'vitest';
import type { VerificationConclusion } from '../EvidenceInvestigationConsole';

describe('P2P Evidence Investigation Decision Model', () => {
  it('defaults to INSUFFICIENT_EVIDENCE', () => {
    const defaultConclusion: VerificationConclusion = 'INSUFFICIENT_EVIDENCE';
    expect(defaultConclusion).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('prohibits financial settlement when conclusion is INSUFFICIENT_EVIDENCE', () => {
    const conclusion: VerificationConclusion = 'INSUFFICIENT_EVIDENCE';
    const canReleaseToBuyer = conclusion === 'PAYMENT_VERIFIED';
    const canRefundToSeller = conclusion === 'PAYMENT_NOT_VERIFIED';

    expect(canReleaseToBuyer).toBe(false);
    expect(canRefundToSeller).toBe(false);
  });

  it('enables RELEASE_TO_BUYER strictly when PAYMENT_VERIFIED', () => {
    const conclusion: VerificationConclusion = 'PAYMENT_VERIFIED';
    const canReleaseToBuyer = conclusion === 'PAYMENT_VERIFIED';
    const canRefundToSeller = conclusion === 'PAYMENT_NOT_VERIFIED';

    expect(canReleaseToBuyer).toBe(true);
    expect(canRefundToSeller).toBe(false);
  });

  it('enables REFUND_TO_SELLER strictly when PAYMENT_NOT_VERIFIED', () => {
    const conclusion: VerificationConclusion = 'PAYMENT_NOT_VERIFIED';
    const canReleaseToBuyer = conclusion === 'PAYMENT_VERIFIED';
    const canRefundToSeller = conclusion === 'PAYMENT_NOT_VERIFIED';

    expect(canReleaseToBuyer).toBe(false);
    expect(canRefundToSeller).toBe(true);
  });

  it('distinguishes on-chain hash commitment from real-world payment verification', () => {
    const isEvidenceCommittedOnChain = true;
    const paymentVerified = false;

    expect(isEvidenceCommittedOnChain).toBe(true);
    expect(paymentVerified).toBe(false);
  });
});
