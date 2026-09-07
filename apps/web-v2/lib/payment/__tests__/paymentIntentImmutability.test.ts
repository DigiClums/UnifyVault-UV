import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { vi } from 'vitest';

// Accounts
const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const mockTradeId = 15;
const newTradeId = 16;

// Mock Viem createPublicClient
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getTrade') {
          const tid = Number(args[0]);
          if (tid === mockTradeId || tid === newTradeId) {
            return {
              tradeId: BigInt(tid),
              buyer: mockBuyer,
              seller: mockSeller,
              asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              amount: 100000n,
              fiatAmount: 900n, // 9.00 INR
              fiatCurrency: '0x494e520000000000000000000000000000000000000000000000000000000000', // INR
              state: 2, // FUNDED
              paymentWindow: 900n,
              fundingTimestamp: BigInt(Math.floor(Date.now() / 1000) - 100),
              paymentTimestamp: 0n,
              paymentReference: '0x00',
              evidenceHash: '0x00',
              disputeInitiator: '0x0000000000000000000000000000000000000000',
            };
          }
          throw new Error('Trade not found');
        }
        throw new Error('Unknown function');
      },
    }),
  };
});

import { POST } from '../../../app/api/p2p/payment-intent/route';
import { saveSellerPaymentProfile, getPaymentIntentStorageRoot } from '../paymentIntentStore';
import { saveTradePaymentBinding, getTradeBindingStorageRoot } from '../tradeBindingStore';
import { constructAuthMessage } from '../walletAuth';

const testDir = path.join('/tmp', 'test-intent-m1-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.P2P_BINDING_ROOT = path.join(testDir, 'bindings');
process.env.PAYMENT_DATA_ENCRYPTION_KEY = 'secret_key_minimum_16_characters_long_for_aes';

describe('Phase 2 — PaymentIntent Authoritative TradePaymentBinding Consumption Suite', () => {
  beforeEach(async () => {
    const root = getPaymentIntentStorageRoot();
    const bindingRoot = getTradeBindingStorageRoot();
    const f15 = path.resolve(root, `intent-trade-${mockTradeId}.json`);
    const f16 = path.resolve(root, `intent-trade-${newTradeId}.json`);
    const b15 = path.resolve(bindingRoot, `binding-trade-${mockTradeId}.json`);
    const b16 = path.resolve(bindingRoot, `binding-trade-${newTradeId}.json`);
    const fProfile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);

    if (fs.existsSync(f15))
      try {
        fs.unlinkSync(f15);
      } catch {}
    if (fs.existsSync(f16))
      try {
        fs.unlinkSync(f16);
      } catch {}
    if (fs.existsSync(b15))
      try {
        fs.unlinkSync(b15);
      } catch {}
    if (fs.existsSync(b16))
      try {
        fs.unlinkSync(b16);
      } catch {}
    if (fs.existsSync(fProfile))
      try {
        fs.unlinkSync(fProfile);
      } catch {}

    // Seed authoritative trade payment binding for Trade #15
    await saveTradePaymentBinding({
      tradeId: mockTradeId,
      chainId: 84532,
      escrowAddress: '0x1034c56beeeea68d4bfd6ccdf567a57f12e847c9',
      marketplaceOrderId: 10,
      takeOrderTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sellerAddress: mockSeller,
      buyerAddress: mockBuyer,
      paymentRail: 'UPI',
      paymentDestination: 'bound_seller_vpa@upi',
      sellerSignature: '0x1234',
      signatureTimestamp: Date.now(),
      bindingHash: '0xabcd' as `0x${string}`,
      createdAt: new Date().toISOString(),
    });
  });

  // 1. Initial Creation derives payment destination directly from TradePaymentBinding
  it('1. Initial PaymentIntent creation resolves payment destination from TradePaymentBinding', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('payment-intent', mockTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockBuyer,
        signature,
        timestamp,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('bound_seller_vpa@upi');
    expect(data.upiUri).toContain('pa=bound_seller_vpa%40upi');
  });

  // 2. Seller Profile Update does NOT alter existing trade PaymentIntent
  it('2. Subsequent seller profile update does NOT alter existing trade payment destination', async () => {
    // Step A: Create initial PaymentIntent for Trade #15 with bound VPA
    const ts1 = Date.now();
    const msg1 = constructAuthMessage('payment-intent', mockTradeId, ts1);
    const sig1 = await buyerAccount.signMessage({ message: msg1 });

    const req1 = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockBuyer,
        signature: sig1,
        timestamp: ts1,
      }),
    });

    const res1 = await POST(req1);
    const data1 = await res1.json();
    const originalRef = data1.paymentIntent.reference;
    const originalExpires = data1.paymentIntent.expiresAt;
    expect(data1.paymentIntent.sellerPaymentIdentifier).toBe('bound_seller_vpa@upi');

    // Step B: Seller updates generic profile to an attacker/malicious VPA
    await saveSellerPaymentProfile(mockSeller, 'attacker_modified_profile_vpa@upi');

    // Step C: Re-query / POST for the SAME Trade #15
    const ts2 = Date.now() + 1000;
    const msg2 = constructAuthMessage('payment-intent', mockTradeId, ts2);
    const sig2 = await buyerAccount.signMessage({ message: msg2 });

    const req2 = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockBuyer,
        signature: sig2,
        timestamp: ts2,
      }),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);

    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    // Strict Invariant Check: Must preserve AUTHORITATIVE bound payee
    expect(data2.paymentIntent.sellerPaymentIdentifier).toBe('bound_seller_vpa@upi');
    expect(data2.paymentIntent.reference).toBe(originalRef);
    expect(data2.paymentIntent.expiresAt).toBe(originalExpires);
    expect(data2.upiUri).toContain('pa=bound_seller_vpa%40upi');
  });

  // 3. Buyer-supplied VPA in request body is strictly ignored
  it('3. Client/buyer-supplied sellerUpiId in request body is strictly ignored', async () => {
    const timestamp = Date.now();
    const action = 'payment-intent';
    const message = constructAuthMessage(action, mockTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockBuyer, // Buyer calling
        signature,
        timestamp,
        action,
        sellerUpiId: 'attacker_phishing_vpa@upi', // Buyer attempting to override seller VPA
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    // Must NOT use buyer-supplied VPA
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('bound_seller_vpa@upi');
    expect(data.paymentIntent.sellerPaymentIdentifier).not.toBe('attacker_phishing_vpa@upi');
  });

  // 4. Trade isolation: Trade 15 and Trade 16 resolve distinct authoritative bindings
  it('4. Distinct trades resolve their respective distinct trade payment bindings', async () => {
    // Seed authoritative binding for Trade #16 with distinct VPA
    await saveTradePaymentBinding({
      tradeId: newTradeId,
      chainId: 84532,
      escrowAddress: '0x1034c56beeeea68d4bfd6ccdf567a57f12e847c9',
      marketplaceOrderId: 20,
      takeOrderTxHash: '0x9999999990abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sellerAddress: mockSeller,
      buyerAddress: mockBuyer,
      paymentRail: 'UPI',
      paymentDestination: 'trade16_distinct_vpa@upi',
      sellerSignature: '0x5678',
      signatureTimestamp: Date.now(),
      bindingHash: '0xef01' as `0x${string}`,
      createdAt: new Date().toISOString(),
    });

    const timestamp = Date.now();
    const message = constructAuthMessage('payment-intent', newTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: newTradeId,
        userAddress: mockBuyer,
        signature,
        timestamp,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('trade16_distinct_vpa@upi');
    expect(data.upiUri).toContain('pa=trade16_distinct_vpa%40upi');
  });

  // 5. Active trade without a binding fails closed (400)
  it('5. Active trade without an authoritative binding fails closed', async () => {
    const unboundTradeId = 16;
    // Do not seed binding for Trade 16 in this test
    const timestamp = Date.now();
    const message = constructAuthMessage('payment-intent', unboundTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: unboundTradeId,
        userAddress: mockBuyer,
        signature,
        timestamp,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Authoritative payment binding not found');
  });
});
