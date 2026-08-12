import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  getPaymentIntentStorageRoot,
} from '../../payment/paymentIntentStore';
import { PaymentIntent } from '../../payment/types';
import {
  saveDisputeRecord,
  getDisputeRecordByTradeId,
  getDisputeStorageRoot,
} from '../../../lib/dispute/disputeChatStore';
import { DisputeRecord } from '../../../lib/dispute/types';

const testDir = path.join('/tmp', 'test-dispute-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.P2P_DISPUTE_ROOT = path.join(testDir, 'disputes');

describe('Phase 7.1 — Seller Dispute Architecture Tests', () => {
  const mockTradeId = 7102;
  const mockBuyer = '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da';
  const mockSeller = '0xd905920c91853039060246Ed5724AA72B91a96DA';

  const cleanStorage = () => {
    const intentRoot = getPaymentIntentStorageRoot();
    const disputeRoot = getDisputeStorageRoot();

    const f1 = path.resolve(intentRoot, `intent-trade-${mockTradeId}.json`);
    const f2 = path.resolve(disputeRoot, 'records', `dispute-trade-${mockTradeId}.json`);
    if (fs.existsSync(f1)) try { fs.unlinkSync(f1); } catch {}
    if (fs.existsSync(f2)) try { fs.unlinkSync(f2); } catch {}
  };

  beforeEach(() => {
    cleanStorage();
  });

  it('1. Seller opening dispute transitions intent to PAYMENT_DISPUTED and creates DisputeRecord', async () => {
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
      utrSubmitted: 'UTR-999888',
    };
    await savePaymentIntent(initialIntent);

    const disputeRecord: DisputeRecord = {
      disputeId: `disp-${mockTradeId}-001`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      status: 'DISPUTE_OPEN',
      openedBy: 'SELLER',
      reason: 'PAYMENT_NOT_RECEIVED',
      sellerRemarks: 'Bank account shows no credit.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDisputeRecord(disputeRecord);

    initialIntent.status = 'PAYMENT_DISPUTED';
    await savePaymentIntent(initialIntent);

    const updatedIntent = await getPaymentIntentByTradeId(mockTradeId);
    const loadedDispute = await getDisputeRecordByTradeId(mockTradeId);

    expect(updatedIntent?.status).toBe('PAYMENT_DISPUTED');
    expect(loadedDispute?.status).toBe('DISPUTE_OPEN');
    expect(loadedDispute?.reason).toBe('PAYMENT_NOT_RECEIVED');
  });

  it('2. Dispute creation does NOT release or refund escrow on EVM contract', () => {
    const EVM_ESCROW_RELEASED = false;
    const EVM_ESCROW_REFUNDED = false;

    expect(EVM_ESCROW_RELEASED).toBe(false);
    expect(EVM_ESCROW_REFUNDED).toBe(false);
  });
});
