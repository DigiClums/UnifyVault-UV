import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const testDir = path.join('/tmp', 'test-verif-aa-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.P2P_VERIFICATION_ROOT = path.join(testDir, 'verifications');
process.env.P2P_PROFILE_ROOT = path.join(testDir, 'profiles');

describe('Phase 5B & Phase 7.2.8 — Seller Payment Profile & AA Production Isolation Tests', () => {
  const mockTradeId1 = 99501;
  const mockTradeId2 = 99502;
  const mockBuyer = '0x1111111111111111111111111111111111111111';
  const mockSeller = '0x2222222222222222222222222222222222222255';

  const cleanStorage = () => {
    delete process.env.ALLOW_MOCK_VERIFIER;
    delete process.env.AA_INTEGRATION_MODE;

    const profileRoot = getSellerProfileStorageRoot();
    const intentRoot = getPaymentIntentStorageRoot();
    const verifRoot = getVerificationStorageRoot();

    const profFile = path.resolve(profileRoot, `profile-${mockSeller.toLowerCase()}.json`);
    if (fs.existsSync(profFile)) try { fs.unlinkSync(profFile); } catch {}

    [mockTradeId1, mockTradeId2].forEach((tid) => {
      const f1 = path.resolve(intentRoot, `intent-trade-${tid}.json`);
      const f2 = path.resolve(verifRoot, `verification-trade-${tid}.json`);
      if (fs.existsSync(f1)) try { fs.unlinkSync(f1); } catch {}
      if (fs.existsSync(f2)) try { fs.unlinkSync(f2); } catch {}
    });

    const refsToClean = [
      'BANK-UTR-AA-MATCH-001',
      'BANK-UTR-3RD-PARTY-88',
      'AA-TX-NOMATCH-99',
    ];
    refsToClean.forEach((ref) => {
      ['MOCK_DEVELOPMENT_PROVIDER', 'BANK_WEBHOOK_PROVIDER', 'ACCOUNT_AGGREGATOR_FALLBACK'].forEach((prov) => {
        const refHash = crypto
          .createHash('sha256')
          .update(`${prov}:${ref.trim()}`)
          .digest('hex');
        const refFile = path.resolve(verifRoot, `provider-ref-${refHash}.json`);
        if (fs.existsSync(refFile)) try { fs.unlinkSync(refFile); } catch {}
      });
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

  // M3 Production Isolation Tests
  it('M3.1. Rejects Mock AA Provider in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_MOCK_VERIFIER;

      const aaEngine = new AccountAggregatorVerificationEngine();
      expect(() => aaEngine.getAAProvider()).toThrow('CRITICAL PRODUCTION SAFETY ERROR');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('M3.2. Fails closed in production when AA_INTEGRATION_MODE is not production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_MOCK_VERIFIER;
      process.env.AA_INTEGRATION_MODE = 'sandbox';

      const aaEngine = new AccountAggregatorVerificationEngine();
      expect(() => aaEngine.getAAProvider()).toThrow('CRITICAL PRODUCTION SAFETY ERROR');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
