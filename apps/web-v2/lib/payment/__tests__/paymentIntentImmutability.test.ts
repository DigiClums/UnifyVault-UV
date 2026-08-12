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
import { constructAuthMessage } from '../walletAuth';

const testDir = path.join('/tmp', 'test-intent-m1-' + Math.random().toString(36).slice(2));
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');

describe('Phase 7.2.6 — M1 PaymentIntent Payee Snapshot Immutability Suite', () => {
  beforeEach(async () => {
    const root = getPaymentIntentStorageRoot();
    const f15 = path.resolve(root, `intent-trade-${mockTradeId}.json`);
    const f16 = path.resolve(root, `intent-trade-${newTradeId}.json`);
    const fProfile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);

    if (fs.existsSync(f15)) try { fs.unlinkSync(f15); } catch {}
    if (fs.existsSync(f16)) try { fs.unlinkSync(f16); } catch {}
    if (fs.existsSync(fProfile)) try { fs.unlinkSync(fProfile); } catch {}

    // Initialize Seller VPA 1 in profile
    await saveSellerPaymentProfile(mockSeller, 'original_seller_vpa@upi');
  });

  // 1. Initial Creation snapshots seller VPA at that exact moment
  it('1. Initial PaymentIntent creation snapshots seller VPA from profile', async () => {
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
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('original_seller_vpa@upi');
    expect(data.upiUri).toContain('pa=original_seller_vpa%40upi');
  });

  // 2. Seller Profile Update does NOT alter existing trade PaymentIntent (Snapshot Immutability)
  it('2. Subsequent seller profile update does NOT alter existing PaymentIntent snapshot', async () => {
    // Step A: Create initial PaymentIntent for Trade #15 with VPA 1
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
    expect(data1.paymentIntent.sellerPaymentIdentifier).toBe('original_seller_vpa@upi');

    // Step B: Seller updates profile to VPA 2
    await saveSellerPaymentProfile(mockSeller, 'new_updated_seller_vpa@upi');

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
    // M1 Invariant Check: Must preserve ORIGINAL payee snapshot
    expect(data2.paymentIntent.sellerPaymentIdentifier).toBe('original_seller_vpa@upi');
    expect(data2.paymentIntent.reference).toBe(originalRef);
    expect(data2.paymentIntent.expiresAt).toBe(originalExpires);
    expect(data2.upiUri).toContain('pa=original_seller_vpa%40upi');
  });

  // 3. Buyer-supplied VPA in request body is strictly ignored
  it('3. Client/buyer-supplied sellerUpiId is strictly ignored', async () => {
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
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('original_seller_vpa@upi');
    expect(data.paymentIntent.sellerPaymentIdentifier).not.toBe('attacker_phishing_vpa@upi');
  });

  // 4. New trade created AFTER profile update uses the new profile snapshot
  it('4. New trade created after seller profile update uses newly updated snapshot', async () => {
    // Seller updates profile to VPA 2
    await saveSellerPaymentProfile(mockSeller, 'new_updated_seller_vpa@upi');

    // Create PaymentIntent for NEW Trade #16
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
    // New trade receives the current active profile snapshot
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe('new_updated_seller_vpa@upi');
  });

  // 5. Core Invariants (reference, expiresAt, fiatAmount, fiatCurrency) remain immutable
  it('5. All core fields (reference, expiresAt, fiatAmount, fiatCurrency) are immutable', async () => {
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

    const ts2 = Date.now() + 5000;
    const msg2 = constructAuthMessage('payment-intent', mockTradeId, ts2);
    const sig2 = await sellerAccount.signMessage({ message: msg2 });

    const req2 = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockSeller,
        signature: sig2,
        timestamp: ts2,
      }),
    });

    const res2 = await POST(req2);
    const data2 = await res2.json();

    expect(data2.paymentIntent.id).toBe(data1.paymentIntent.id);
    expect(data2.paymentIntent.reference).toBe(data1.paymentIntent.reference);
    expect(data2.paymentIntent.expiresAt).toBe(data1.paymentIntent.expiresAt);
    expect(data2.paymentIntent.fiatAmount).toBe(data1.paymentIntent.fiatAmount);
    expect(data2.paymentIntent.fiatCurrency).toBe(data1.paymentIntent.fiatCurrency);
    expect(data2.paymentIntent.createdAt).toBe(data1.paymentIntent.createdAt);
  });
});
