import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseUnits, formatUnits } from 'viem';
import { OrderDetails, OrderSide, OrderStatus } from '../../contracts/marketplace';

// Test Keys & Accounts
const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const mockAsset = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`;
const mockEscrow = '0x400916339033b88cda38b1d8a5fb0f82e4889f38' as `0x${string}`;
const mockTradeId = 601;

// Mock Viem createPublicClient for contract RPC read
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getTrade') {
          const tid = Number(args[0]);
          return {
            tradeId: BigInt(tid),
            buyer: mockBuyer,
            seller: mockSeller,
            asset: mockAsset,
            amount: 1000000000000000000n, // 1 UVBE
            fiatAmount: 20000n, // 200.00 INR
            fiatCurrency: '0x494e520000000000000000000000000000000000000000000000000000000000',
            state: 2, // FUNDED
            paymentWindow: 900n,
            fundingTimestamp: BigInt(Math.floor(Date.now() / 1000) - 100),
            paymentTimestamp: 0n,
            paymentReference: '0x00',
            evidenceHash: '0x00',
            disputeInitiator: '0x0000000000000000000000000000000000000000',
          };
        }
        throw new Error('Unknown function');
      },
    }),
  };
});

import {
  saveTradePaymentBinding,
  getTradePaymentBinding,
  getTradeBindingStorageRoot,
} from '../tradeBindingStore';
import { constructTradePaymentBindingMessage, verifyTradePaymentBindingAuth } from '../walletAuth';
import { validateUpiId } from '../../p2p/upiValidation';
import { POST as paymentIntentPOST } from '../../../app/api/p2p/payment-intent/route';

describe('Phase 3 — TakeOrderModal Pre-Trade Signing & TradePaymentBinding Integration', () => {
  const testStorageDir = path.join(
    '/tmp',
    'test-phase3-take-order-' + Math.random().toString(36).slice(2),
  );
  process.env.P2P_INTENT_ROOT = path.join(testStorageDir, 'intents');
  process.env.P2P_BINDING_ROOT = path.join(testStorageDir, 'bindings');
  process.env.P2P_PROFILE_ROOT = path.join(testStorageDir, 'profiles');

  beforeEach(() => {
    [
      process.env.P2P_INTENT_ROOT,
      process.env.P2P_BINDING_ROOT,
      process.env.P2P_PROFILE_ROOT,
    ].forEach((dir) => {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {}
      }
    });
  });

  afterEach(() => {
    [
      process.env.P2P_INTENT_ROOT,
      process.env.P2P_BINDING_ROOT,
      process.env.P2P_PROFILE_ROOT,
    ].forEach((dir) => {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {}
      }
    });
  });

  it('1. Validates seller UPI input with UPI validator', () => {
    const valid = validateUpiId('seller.payment@okhdfcbank');
    expect(valid.isValid).toBe(true);
    expect(valid.trimmedUpi).toBe('seller.payment@okhdfcbank');

    const invalid = validateUpiId('not-a-valid-upi');
    expect(invalid.isValid).toBe(false);
  });

  it('2. Constructs and signs domain-separated payment binding authorization message', async () => {
    const orderId = 101;
    const paymentDestination = 'seller.trade@okaxis';
    const timestamp = Date.now();

    const message = constructTradePaymentBindingMessage({
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      sellerAddress: mockSeller,
      paymentRail: 'UPI',
      paymentDestination,
      timestamp,
    });

    expect(message).toContain('UnifyVault P2P Trade Payment Binding');
    expect(message).toContain(`Marketplace Order ID: ${orderId}`);
    expect(message).toContain(`Seller Wallet: ${mockSeller.toLowerCase()}`);
    expect(message).toContain(`Payment Destination: ${paymentDestination.toLowerCase()}`);

    const signature = await sellerAccount.signMessage({ message });
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

    // Verify signature
    const authCheck = await verifyTradePaymentBindingAuth({
      sellerAddress: mockSeller,
      signature,
      signatureTimestamp: timestamp,
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      paymentRail: 'UPI',
      paymentDestination,
    });

    expect(authCheck.isValid).toBe(true);
  });

  it('3. Persists TradePaymentBinding immutably after transaction confirmation', async () => {
    const tradeId = 501;
    const orderId = 101;
    const paymentDestination = 'seller.authorized@okaxis';
    const timestamp = Date.now();

    const message = constructTradePaymentBindingMessage({
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      sellerAddress: mockSeller,
      paymentRail: 'UPI',
      paymentDestination,
      timestamp,
    });

    const signature = await sellerAccount.signMessage({ message });

    const binding = await saveTradePaymentBinding({
      tradeId,
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      takeOrderTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sellerAddress: mockSeller,
      buyerAddress: mockBuyer,
      paymentRail: 'UPI',
      paymentDestination,
      sellerSignature: signature,
      signatureTimestamp: timestamp,
      bindingHash: '0xabcdef123456',
      createdAt: new Date().toISOString(),
    });

    expect(binding.binding.tradeId).toBe(tradeId);
    expect(binding.binding.paymentDestination).toBe(paymentDestination);

    // Retrieve binding
    const retrieved = await getTradePaymentBinding(tradeId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.paymentDestination).toBe(paymentDestination);
    expect(retrieved?.sellerAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
  });

  it('4. PaymentIntent successfully derives payee from TradePaymentBinding', async () => {
    const tradeId = mockTradeId;
    const orderId = 102;
    const paymentDestination = 'seller.intent.test@okhdfcbank';
    const timestamp = Date.now();

    const message = constructTradePaymentBindingMessage({
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      sellerAddress: mockSeller,
      paymentRail: 'UPI',
      paymentDestination,
      timestamp,
    });

    const signature = await sellerAccount.signMessage({ message });

    await saveTradePaymentBinding({
      tradeId,
      chainId: 8453,
      escrowAddress: mockEscrow,
      marketplaceOrderId: orderId,
      takeOrderTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sellerAddress: mockSeller,
      buyerAddress: mockBuyer,
      paymentRail: 'UPI',
      paymentDestination,
      sellerSignature: signature,
      signatureTimestamp: timestamp,
      bindingHash: '0xabcdef123456',
      createdAt: new Date().toISOString(),
    });

    const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
      method: 'POST',
      headers: { 'x-skip-auth': 'true' },
      body: JSON.stringify({
        tradeId,
        userAddress: mockBuyer,
        timestamp,
      }),
    });

    const res = await paymentIntentPOST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.paymentIntent.sellerPaymentIdentifier).toBe(paymentDestination);
    expect(data.upiUri).toContain(encodeURIComponent(paymentDestination));
  });
});
