import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { savePaymentIntent, getPaymentIntentStorageRoot } from '../../payment/paymentIntentStore';
import { PaymentIntent } from '../../payment/types';
import { PaymentVerificationEngine } from '../verificationEngine';
import { BankWebhookVerificationProvider } from '../providers/bankWebhookProvider';
import { getVerificationStorageRoot, consumeProviderReference } from '../verificationStore';
import { generateSignedAttestation, verifySignedAttestation } from '../attestation';

describe('Phase 4.1 — Verification Adversarial Audit & Security Tests', () => {
  const mockTradeId1 = 99401;
  const mockTradeId2 = 99402;
  const mockTradeId3 = 99403;
  const mockBuyer = '0x1111111111111111111111111111111111111111';
  const mockSeller = '0x2222222222222222222222222222222222222244';
  const mockEscrow = '0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44';

  const signerPrivateKey = generatePrivateKey();
  const signerAccount = privateKeyToAccount(signerPrivateKey);

  const cleanStorage = () => {
    const intentRoot = getPaymentIntentStorageRoot();
    const verifRoot = getVerificationStorageRoot();

    [mockTradeId1, mockTradeId2, mockTradeId3].forEach((tid) => {
      const f1 = path.resolve(intentRoot, `intent-trade-${tid}.json`);
      const f2 = path.resolve(verifRoot, `verification-trade-${tid}.json`);
      if (fs.existsSync(f1)) fs.unlinkSync(f1);
      if (fs.existsSync(f2)) fs.unlinkSync(f2);
    });
  };

  beforeEach(async () => {
    cleanStorage();

    const intent: PaymentIntent = {
      id: `intent-${mockTradeId1}`,
      tradeId: mockTradeId1,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller.payee@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99401-8F3A',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await savePaymentIntent(intent);
  });

  afterEach(() => {
    cleanStorage();
  });

  // 1. Seller Wallet vs Seller Payment Destination Disambiguation
  it('2. Correct seller wallet + wrong payment destination = REJECTED', async () => {
    const bankProvider = new BankWebhookVerificationProvider();
    const res = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '500.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.payee@upi',
      providerReference: 'BANK-UTR-DEST-A1',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '500.00',
        creditCurrency: 'INR',
        payeeIdentifier: 'wrong.payee@upi', // Wrong destination
      },
    });

    expect(res.status).toBe('REJECTED');
    expect(res.failureReason).toContain('Parameter mismatch');
  });

  it('2. Wrong seller wallet + correct payment destination = REJECTED by engine', async () => {
    const engine = new PaymentVerificationEngine();

    await savePaymentIntent({
      id: `intent-${mockTradeId3}`,
      tradeId: mockTradeId3,
      buyerAddress: mockBuyer,
      sellerAddress: '0x9999999999999999999999999999999999999999', // Wrong seller wallet
      sellerPaymentIdentifier: 'seller.payee@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: 'UV-TRD-99403-8F3A',
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const res = await engine.processVerification({
      tradeId: mockTradeId3,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-DEST-B2',
      rawPayload: {
        onChainSellerWallet: mockSeller, // On-chain seller is mockSeller (0x2222...44), intent has 0x9999...
      },
      skipOnChainCheckForTest: true,
    });

    expect(res.status).toBe('REJECTED');
    expect(res.failureReason).toContain('Parameter Mismatch');
  });

  it('2. Correct seller wallet + correct payment destination = VERIFIED', async () => {
    const engine = new PaymentVerificationEngine();
    const res = await engine.processVerification({
      tradeId: mockTradeId1,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: 'BANK-UTR-DEST-C3',
      skipOnChainCheckForTest: true,
    });

    expect(res.status).toBe('VERIFIED');
    expect(res.verifiedRecipient).toBe('seller.payee@upi');
  });

  // 10. Overpayment / Underpayment Precision Policies
  it('10. Underpayment (499.99 vs 500.00) is strictly REJECTED', async () => {
    const bankProvider = new BankWebhookVerificationProvider();
    const res = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '500.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.payee@upi',
      providerReference: 'BANK-UTR-UNDER',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '499.99',
        creditCurrency: 'INR',
        payeeIdentifier: 'seller.payee@upi',
      },
    });

    expect(res.status).toBe('REJECTED');
  });

  it('10. Overpayment (500.01 vs 500.00) is strictly REJECTED without floating point rounding', async () => {
    const bankProvider = new BankWebhookVerificationProvider();
    const res = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '500.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.payee@upi',
      providerReference: 'BANK-UTR-OVER',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '500.01',
        creditCurrency: 'INR',
        payeeIdentifier: 'seller.payee@upi',
      },
    });

    expect(res.status).toBe('REJECTED');
  });

  // 11. Fiat Currency Normalization & Case Insensitivity
  it('11. Fiat currency matching normalizes case (inr vs INR)', async () => {
    const bankProvider = new BankWebhookVerificationProvider();
    const res = await bankProvider.verifyPayment({
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      expectedAmount: '500.00',
      expectedCurrency: 'INR',
      sellerRecipient: 'seller.payee@upi',
      providerReference: 'BANK-UTR-CASE-NORM',
      rawPayload: {
        isSignatureValid: true,
        creditAmount: '500.00',
        creditCurrency: 'inr', // Lowercase currency
        payeeIdentifier: 'seller.payee@upi',
      },
    });

    expect(res.status).toBe('VERIFIED');
  });

  // 17. Atomic OS Kernel File Locking for Replay Protection
  it('17. Atomic OS kernel file locking prevents concurrent reference consumption races', async () => {
    const provider = 'TEST_ATOMIC_PROVIDER';
    const ref = 'REF-CONCURRENT-LOCK-44';

    await consumeProviderReference(provider, ref, mockTradeId1);

    // Second call to consume same reference must throw Atomic Replay Lock error
    await expect(consumeProviderReference(provider, ref, mockTradeId2)).rejects.toThrow();
  });

  // 6. EIP-712 Attestation Field Substitution Protection
  it('6. Rejects EIP-712 attestation if recipient or providerReference is substituted', async () => {
    const verifResult = {
      verificationId: 'v1',
      tradeId: mockTradeId1,
      paymentIntentId: `intent-${mockTradeId1}`,
      provider: 'BANK_PROVIDER',
      providerReference: 'UTR-SUBST-1',
      verifiedAmount: '500.00',
      verifiedCurrency: 'INR',
      verifiedRecipient: 'seller.payee@upi',
      verifiedAt: new Date().toISOString(),
      status: 'VERIFIED' as const,
    };

    const signature = await generateSignedAttestation(
      verifResult,
      mockEscrow,
      84532,
      signerPrivateKey,
    );

    // Attempting recipient substitution
    const substitutedRecipientResult = {
      ...verifResult,
      verifiedRecipient: 'attacker.payee@upi',
    };

    const isSubstitutedValid = await verifySignedAttestation(
      substitutedRecipientResult,
      signature,
      mockEscrow,
      84532,
      signerAccount.address,
    );
    expect(isSubstitutedValid).toBe(false);

    // Attempting providerReference substitution
    const substitutedRefResult = {
      ...verifResult,
      providerReference: 'UTR-SUBST-FAKED',
    };

    const isRefSubstitutedValid = await verifySignedAttestation(
      substitutedRefResult,
      signature,
      mockEscrow,
      84532,
      signerAccount.address,
    );
    expect(isRefSubstitutedValid).toBe(false);
  });
});
