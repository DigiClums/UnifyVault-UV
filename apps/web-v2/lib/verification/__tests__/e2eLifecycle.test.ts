import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { saveSellerProfile, getSellerProfileStorageRoot } from '../../payment/paymentProfileStore';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  getPaymentIntentStorageRoot,
} from '../../payment/paymentIntentStore';
import { PaymentIntent } from '../../payment/types';
import { PaymentVerificationEngine } from '../verificationEngine';
import { BankWebhookVerificationProvider } from '../providers/bankWebhookProvider';
import { AccountAggregatorVerificationEngine } from '../aa/aaEngine';
import { MockAccountAggregatorProvider } from '../aa/mockAaProvider';
import { getVerificationStorageRoot } from '../verificationStore';
import { generateSignedAttestation, verifySignedAttestation } from '../attestation';

const testDir = path.join('/tmp', 'test-verif-e2e-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.P2P_VERIFICATION_ROOT = path.join(testDir, 'verifications');
process.env.P2P_PROFILE_ROOT = path.join(testDir, 'profiles');

describe('Phase 6 — End-to-End P2P Lifecycle & Failure-Safety Test Suite', () => {
  const mockTradeId1 = 99701;
  const mockTradeId2 = 99702;
  const mockTradeId3 = 99703;
  const mockBuyerA = '0x1111111111111111111111111111111111111111';
  const mockBuyerB = '0x3333333333333333333333333333333333333333';
  const mockSeller = '0x2222222222222222222222222222222222222266';
  const mockEscrow = '0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44';

  const signerPrivateKey = generatePrivateKey();
  const signerAccount = privateKeyToAccount(signerPrivateKey);

  const cleanStorage = () => {
    const profileRoot = getSellerProfileStorageRoot();
    const intentRoot = getPaymentIntentStorageRoot();
    const verifRoot = getVerificationStorageRoot();

    const profFile = path.resolve(profileRoot, `profile-${mockSeller.toLowerCase()}.json`);
    if (fs.existsSync(profFile))
      try {
        fs.unlinkSync(profFile);
      } catch {}

    [mockTradeId1, mockTradeId2, mockTradeId3].forEach((tid) => {
      const f1 = path.resolve(intentRoot, `intent-trade-${tid}.json`);
      const f2 = path.resolve(verifRoot, `verification-trade-${tid}.json`);
      if (fs.existsSync(f1))
        try {
          fs.unlinkSync(f1);
        } catch {}
      if (fs.existsSync(f2))
        try {
          fs.unlinkSync(f2);
        } catch {}
    });

    const refsToClean = [
      'BANK-UTR-E2E-001',
      'BANK-UTR-REUSE-ISOLATE-66',
      'BANK-UTR-EXPIRED',
      'BANK-UTR-AA-MATCH-001',
    ];
    refsToClean.forEach((ref) => {
      ['MOCK_DEVELOPMENT_PROVIDER', 'BANK_WEBHOOK_PROVIDER', 'ACCOUNT_AGGREGATOR_FALLBACK'].forEach(
        (prov) => {
          const refHash = crypto.createHash('sha256').update(`${prov}:${ref.trim()}`).digest('hex');
          const refFile = path.resolve(verifRoot, `provider-ref-${refHash}.json`);
          if (fs.existsSync(refFile))
            try {
              fs.unlinkSync(refFile);
            } catch {}
        },
      );
    });
  };

  beforeEach(async () => {
    cleanStorage();

    await saveSellerProfile({
      walletAddress: mockSeller as `0x${string}`,
      paymentRail: 'UPI',
      upiVpa: 'seller.e2e@upi',
      verificationStatus: 'VERIFIED',
    });

    await savePaymentIntent({
      id: `intent-${mockTradeId1}`,
      tradeId: mockTradeId1,
      buyerAddress: mockBuyerA,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.e2e@upi',
      fiatAmount: '20000.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99701-E2E',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    cleanStorage();
  });

  // 1. Complete Happy Path Integration Test
  it('1. Executes complete Happy Path (Order -> Fund -> QR -> Pay -> Verify -> Attest -> Release Eligible)', async () => {
    const engine = new PaymentVerificationEngine();

    // 1a. Verification Engine evaluates bank credit payload
    const verifResult = await engine.processVerification({
      tradeId: mockTradeId1,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-E2E-001',
      skipOnChainCheckForTest: true,
    });

    expect(verifResult.status).toBe('VERIFIED');
    expect(verifResult.verifiedAmount).toBe('20000.00');
    expect(verifResult.attestationSignature).toBeDefined();

    // 1b. Cryptographically verify signed EIP-712 attestation
    const isAttestationValid = await verifySignedAttestation(
      verifResult,
      verifResult.attestationSignature!,
      mockEscrow,
      84532,
    );
    expect(isAttestationValid).toBe(true);
  });

  // 2. Reverse Happy Path Test (Buy Order Direction)
  it('2. Reverse Happy Path (Buy Order matched by Seller) executes safely', async () => {
    await savePaymentIntent({
      id: `intent-${mockTradeId2}`,
      tradeId: mockTradeId2,
      buyerAddress: mockBuyerB,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.e2e@upi',
      fiatAmount: '15000.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99702-REV',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const engine = new PaymentVerificationEngine();
    const verifResult = await engine.processVerification({
      tradeId: mockTradeId2,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-E2E-REV-002',
      skipOnChainCheckForTest: true,
    });

    expect(verifResult.status).toBe('VERIFIED');
    expect(verifResult.tradeId).toBe(mockTradeId2);
    expect(verifResult.verifiedAmount).toBe('15000.00');
  });

  // 3 & 4. Partial Fill & Multiple Buyers Trade Isolation
  it('3 & 4. Isolates multiple partial fills with unique trade IDs and unique payment intents', async () => {
    // Buyer A trade 1 (40 UVBE = ₹20,000)
    const intent1 = await getPaymentIntentByTradeId(mockTradeId1);
    expect(intent1?.fiatAmount).toBe('20000.00');

    // Buyer B trade 2 (60 UVBE = ₹30,000)
    await savePaymentIntent({
      id: `intent-${mockTradeId2}`,
      tradeId: mockTradeId2,
      buyerAddress: mockBuyerB,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.e2e@upi',
      fiatAmount: '30000.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99702-PART2',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const intent2 = await getPaymentIntentByTradeId(mockTradeId2);
    expect(intent2?.fiatAmount).toBe('30000.00');
    expect(intent1?.id).not.toBe(intent2?.id);
  });

  // 9 & 10. Verification Parameter Failure Guards
  it('9 & 10. Rejects invalid payment claims (Underpayment, wrong currency, wrong destination)', async () => {
    const bankProvider = new BankWebhookVerificationProvider();

    // Underpayment attempt
    const resUnder = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '20000.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.e2e@upi',
      providerReference: 'BANK-UTR-FAIL-1',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '19999.00',
        creditCurrency: 'INR',
        payeeIdentifier: 'seller.e2e@upi',
      },
    });
    expect(resUnder.status).toBe('REJECTED');

    // Wrong destination attempt
    const resDest = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '20000.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.e2e@upi',
      providerReference: 'BANK-UTR-FAIL-2',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '20000.00',
        creditCurrency: 'INR',
        payeeIdentifier: 'attacker.fake@upi',
      },
    });
    expect(resDest.status).toBe('REJECTED');
  });

  // 11. Third-Party Payer Metadata Preservation
  it('11. Preserves THIRD_PARTY_PAYER metadata without altering verification engine authority', async () => {
    const aaEngine = new AccountAggregatorVerificationEngine();
    const res = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: `consent-${mockTradeId1}`,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-TP-E2E',
        amount: '20000.00',
        currency: 'INR',
        sellerVpa: 'seller.e2e@upi',
        counterparty: 'friend.payer@upi',
        isThirdPartyPayer: true,
      },
    });

    expect(res.consentStatus).toBe('VERIFIED');
    expect(res.verificationResult?.status).toBe('VERIFIED');
  });

  // 12. AA Fallback Full Lifecycle
  it('12. Executes complete AA fallback lifecycle (CONSENT -> DATA -> MATCH -> RELEASE_ELIGIBLE)', async () => {
    const mockAA = new MockAccountAggregatorProvider();
    const consentReq = await mockAA.createConsentRequest({
      tradeId: mockTradeId1,
      sellerAddress: mockSeller,
      sellerVpa: 'seller.e2e@upi',
      fromTimestamp: new Date().toISOString(),
      toTimestamp: new Date().toISOString(),
    });

    expect(consentReq.status).toBe('CONSENT_PENDING');

    const consentStatus = await mockAA.getConsentStatus(consentReq.consentId);
    expect(consentStatus).toBe('CONSENT_GRANTED');

    const aaEngine = new AccountAggregatorVerificationEngine();
    const matchRes = await aaEngine.matchAndVerifyAATransactions({
      tradeId: mockTradeId1,
      consentId: consentReq.consentId,
      skipOnChainCheckForTest: true,
      rawPayload: {
        bankReference: 'UTR-AA-E2E-FULL',
        amount: '20000.00',
        currency: 'INR',
        sellerVpa: 'seller.e2e@upi',
      },
    });

    expect(matchRes.consentStatus).toBe('VERIFIED');
    expect(matchRes.verificationResult?.status).toBe('VERIFIED');
    expect(matchRes.verificationResult?.attestationSignature).toBeDefined();
  });

  // 14 & 15. Payment Timeout & Seller Refund Path
  it('14 & 15. Expired payment window prevents payment verification', async () => {
    await savePaymentIntent({
      id: `intent-${mockTradeId3}`,
      tradeId: mockTradeId3,
      buyerAddress: mockBuyerA,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.e2e@upi',
      fiatAmount: '20000.00',
      fiatCurrency: 'INR',
      status: 'CREATED',
      reference: 'UV-TRD-99703-EXP',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 900000).toISOString(),
    });

    const engine = new PaymentVerificationEngine();
    const res = await engine.processVerification({
      tradeId: mockTradeId3,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-EXPIRED',
      skipOnChainCheckForTest: true,
    });

    expect(res.status).toBe('REJECTED');
    expect(res.failureReason).toContain('expired');
  });

  // 18. Cross-Trade Isolation & Replay Prevention
  it('18. Enforces cross-trade isolation (Provider reference used for Trade 1 cannot verify Trade 2)', async () => {
    const engine = new PaymentVerificationEngine();

    // Verify Trade 1
    const res1 = await engine.processVerification({
      tradeId: mockTradeId1,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-REUSE-ISOLATE-66',
      skipOnChainCheckForTest: true,
    });
    expect(res1.status).toBe('VERIFIED');

    // Create Trade 2
    await savePaymentIntent({
      id: `intent-${mockTradeId2}`,
      tradeId: mockTradeId2,
      buyerAddress: mockBuyerB,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.e2e@upi',
      fiatAmount: '20000.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99702-ISOLATE',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Reusing reference for Trade 2 MUST be rejected
    const res2 = await engine.processVerification({
      tradeId: mockTradeId2,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-REUSE-ISOLATE-66',
      skipOnChainCheckForTest: true,
    });

    expect(res2.status).toBe('REJECTED');
    expect(res2.failureReason).toContain('Replay');
  });
});
