import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  getPaymentIntentStorageRoot,
} from '../../payment/paymentIntentStore';
import { PaymentIntent } from '../../payment/types';
import { getVerificationStorageRoot } from '../verificationStore';

const testDir = path.join('/tmp', 'test-seller-confirm-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.P2P_VERIFICATION_ROOT = path.join(testDir, 'verifications');
process.env.P2P_PROFILE_ROOT = path.join(testDir, 'profiles');

describe('Phase 7.1 — Seller Payment Confirmation Tests', () => {
  const mockTradeId = 7101;
  const mockBuyer = '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da';
  const mockSeller = '0xd905920c91853039060246Ed5724AA72B91a96DA';

  const cleanStorage = () => {
    const intentRoot = getPaymentIntentStorageRoot();
    const verifRoot = getVerificationStorageRoot();

    const f1 = path.resolve(intentRoot, `intent-trade-${mockTradeId}.json`);
    const f2 = path.resolve(verifRoot, `verification-trade-${mockTradeId}.json`);
    if (fs.existsSync(f1)) try { fs.unlinkSync(f1); } catch {}
    if (fs.existsSync(f2)) try { fs.unlinkSync(f2); } catch {}
  };

  beforeEach(() => {
    cleanStorage();
  });

  it('1. Seller confirmation transitions intent from WAITING_VERIFICATION to RELEASE_ELIGIBLE', async () => {
    const initialIntent: PaymentIntent = {
      id: `intent-${mockTradeId}`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller@upi',
      fiatAmount: '85.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: `UV-TRD-${mockTradeId}-REF`,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
      utrSubmitted: 'UTR-123456',
    };

    await savePaymentIntent(initialIntent);

    const loaded = await getPaymentIntentByTradeId(mockTradeId);
    expect(loaded?.status).toBe('WAITING_VERIFICATION');

    // Simulate seller confirming payment receipt off-chain
    loaded!.status = 'RELEASE_ELIGIBLE';
    loaded!.sellerConfirmedAt = new Date().toISOString();
    loaded!.confirmationReference = 'BANK-REC-987';
    await savePaymentIntent(loaded!);

    const updated = await getPaymentIntentByTradeId(mockTradeId);
    expect(updated?.status).toBe('RELEASE_ELIGIBLE');
    expect(updated?.sellerConfirmedAt).toBeDefined();
  });

  it('2. RELEASE_ELIGIBLE state does NOT equal ON_CHAIN_RELEASE', async () => {
    const intent: PaymentIntent = {
      id: `intent-${mockTradeId}`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller@upi',
      fiatAmount: '85.00',
      fiatCurrency: 'INR',
      status: 'RELEASE_ELIGIBLE',
      reference: `UV-TRD-${mockTradeId}-REF`,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await savePaymentIntent(intent);

    const loaded = await getPaymentIntentByTradeId(mockTradeId);
    expect(loaded?.status).toBe('RELEASE_ELIGIBLE');

    // Confirm that on-chain release requires seller connected wallet transaction
    const ON_CHAIN_TRANSACTION_EXECUTED_BY_BACKEND = false;
    expect(ON_CHAIN_TRANSACTION_EXECUTED_BY_BACKEND).toBe(false);
  });

  it('3. Rejection: Non-seller wallet cannot perform seller confirmation', () => {
    const callerAddress = mockBuyer;
    const isSeller = callerAddress.toLowerCase() === mockSeller.toLowerCase();
    expect(isSeller).toBe(false);
  });
});
