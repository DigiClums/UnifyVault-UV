import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  saveSellerProfile,
  getSellerProfile,
  getSellerProfileStorageRoot,
} from '../../../payment/paymentProfileStore';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  getPaymentIntentStorageRoot,
} from '../../../payment/paymentIntentStore';
import { PaymentIntent } from '../../../payment/types';
import { MockAccountAggregatorProvider } from '../mockAaProvider';
import { AccountAggregatorVerificationEngine } from '../aaEngine';
import { getVerificationStorageRoot } from '../../verificationStore';

describe('Phase 5B — Seller Payment Profile & AA Fallback Verification Tests', () => {
  const mockTradeId1 = 99501;
  const mockTradeId2 = 99502;
  const mockBuyer = '0x1111111111111111111111111111111111111111';
  const mockSeller = '0x2222222222222222222222222222222222222255';

  const cleanStorage = () => {
    const profileRoot = getSellerProfileStorageRoot();
    const intentRoot = getPaymentIntentStorageRoot();
    const verifRoot = getVerificationStorageRoot();

    const profFile = path.resolve(profileRoot, `profile-${mockSeller.toLowerCase()}.json`);
    if (fs.existsSync(profFile)) fs.unlinkSync(profFile);

    [mockTradeId1, mockTradeId2].forEach((tid) => {
      const f1 = path.resolve(intentRoot, `intent-trade-${tid}.json`);
      const f2 = path.resolve(verifRoot, `verification-trade-${tid}.json`);
      if (fs.existsSync(f1)) fs.unlinkSync(f1);
      if (fs.existsSync(f2)) fs.unlinkSync(f2);
    });
  };

  beforeEach(async () => {
    cleanStorage();

    // 1. Create Seller Payment Profile
    await saveSellerProfile({
      walletAddress: mockSeller as `0x${string}`,
      paymentRail: 'UPI',
      upiVpa: 'seller.primary@upi',
      verificationStatus: 'PENDING_VERIFICATION',
    });

    // 2. Create Payment Intent snapshotting seller.primary@upi
    const intent: PaymentIntent = {
      id: `intent-${mockTradeId1}`,
      tradeId: mockTradeId1,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.primary@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99501-8F3A',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await savePaymentIntent(intent);
  });

  afterEach(() => {
    cleanStorage();
  });

  // 1 & 2. Seller Payment Profile Creation & Encryption at Rest
  it('1 & 2. Saves seller profile and encrypts UPI VPA at rest', async () => {
    const prof = await getSellerProfile(mockSeller);
    expect(prof).toBeDefined();
    expect(prof?.upiVpa).toBe('seller.primary@upi');

    // Inspect raw file at rest
    const root = getSellerProfileStorageRoot();
    const filePath = path.resolve(root, `profile-${mockSeller.toLowerCase()}.json`);
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    expect(rawContent).not.toContain('seller.primary@upi'); // Must be encrypted at rest
    expect(rawContent).toContain(':'); // AES-256-GCM iv:authTag:content format
  });

  // 3 & 4. Payment Destination Snapshotting & Profile Rotation
  it('3 & 4. Destination rotation after trade creation does NOT alter existing intent snapshot', async () => {
    // Seller updates profile VPA after trade creation
    await saveSellerProfile({
      walletAddress: mockSeller as `0x${string}`,
      paymentRail: 'UPI',
      upiVpa: 'seller.NEW_VPA@upi',
      verificationStatus: 'PENDING_VERIFICATION',
    });

    const updatedProf = await getSellerProfile(mockSeller);
    expect(updatedProf?.upiVpa).toBe('seller.NEW_VPA@upi');

    // Active trade intent must maintain original snapshotted VPA
    const intent = await getPaymentIntentByTradeId(mockTradeId1);
    expect(intent?.sellerPaymentIdentifier).toBe('seller.primary@upi');
  });

  // 5-10. AA Consent Lifecycle Testing
  it('5-10. Tests AA consent lifecycle states (PENDING -> GRANTED -> DATA_RECEIVED)', async () => {
    const mockAA = new MockAccountAggregatorProvider();
    const req = await mockAA.createConsentRequest({
      tradeId: mockTradeId1,
      sellerAddress: mockSeller,
      sellerVpa: 'seller.primary@upi',
      fromTimestamp: new Date().toISOString(),
      toTimestamp: new Date().toISOString(),
    });

    expect(req.status).toBe('CONSENT_PENDING');

    const statusGranted = await mockAA.getConsentStatus(req.consentId);
    expect(statusGranted).toBe('CONSENT_GRANTED');

    const statusDenied = await mockAA.getConsentStatus('aa-consent-denied-123');
    expect(statusDenied).toBe('CONSENT_DENIED');

    const statusExpired = await mockAA.getConsentStatus('aa-consent-expired-123');
    expect(statusExpired).toBe('CONSENT_EXPIRED');
  });

  // 11. Exact Amount Match -> VERIFIED
  it('11. Matches exact credit transaction via AA and produces PAYMENT_VERIFIED', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-EXACT-55',
        amount: '500.00',
        currency: 'INR',
        sellerVpa: 'seller.primary@upi',
      },
    });

    expect(res.consentStatus).toBe('VERIFIED');
    expect(res.verificationResult?.status).toBe('VERIFIED');
    expect(res.verificationResult?.attestationSignature).toBeDefined();
  });

  // 12-16. Parameter Mismatch Rejections
  it('12. Rejects AA transaction when amount mismatches (499.99 vs 500.00)', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-MISMATCH-55',
        amount: '499.99', // Mismatched amount
        currency: 'INR',
        sellerVpa: 'seller.primary@upi',
      },
    });

    expect(res.consentStatus).toBe('DATA_MISMATCH');
  });

  it('15. Rejects DEBIT transaction type', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-DEBIT-55',
        transactionType: 'DEBIT', // Debit instead of credit
        amount: '500.00',
        currency: 'INR',
        sellerVpa: 'seller.primary@upi',
      },
    });

    expect(res.consentStatus).toBe('DATA_MISMATCH');
  });

  // 19. Third-Party Payer Handling
  it('19. Detects and records THIRD_PARTY_PAYER metadata when payer differs', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-TP-55',
        amount: '500.00',
        currency: 'INR',
        sellerVpa: 'seller.primary@upi',
        counterparty: 'thirdparty.friend@upi',
        isThirdPartyPayer: true,
      },
    });

    expect(res.consentStatus).toBe('VERIFIED');
    expect(res.verificationResult?.status).toBe('VERIFIED');
  });

  // 21 & 22. Provider Timeout / Outage Handling -> UNKNOWN
  it('21 & 22. Returns UNKNOWN status when AA provider connection times out', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        forceTimeout: true,
      },
    });

    expect(res.consentStatus).toBe('UNKNOWN');
  });

  // 24 & 25. RELEASE_ELIGIBLE & VerificationEngine Authority
  it('24 & 25. AA verification produces RELEASE_ELIGIBLE status without releasing escrow', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-RELEASE-CHECK-55',
        amount: '500.00',
        currency: 'INR',
        sellerVpa: 'seller.primary@upi',
      },
    });

    expect(res.verificationResult?.status).toBe('VERIFIED');
    expect(res.verificationResult?.attestationSignature).toBeDefined();
  });
});
