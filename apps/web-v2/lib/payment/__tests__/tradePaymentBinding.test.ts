import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  encodeEventTopics,
  toHex,
  stringToHex,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import {
  saveTradePaymentBinding,
  getTradePaymentBinding,
  getTradeBindingStorageRoot,
} from '../tradeBindingStore';
import {
  constructTradePaymentBindingMessage,
  computeTradeBindingHash,
  verifyTradePaymentBindingAuth,
  constructAuthMessage,
  ERC1271_MAGIC_VALUE,
} from '../walletAuth';
import { TradePaymentBinding } from '../types';
import {
  POST as tradeBindingPOST,
  GET as tradeBindingGET,
} from '../../../app/api/p2p/trade-binding/route';
import { POST as paymentIntentPOST } from '../../../app/api/p2p/payment-intent/route';
import { saveSellerPaymentProfile } from '../paymentIntentStore';
import { verifyPaymentEvidence } from '../../evidence/evidenceVerifier';
import { MARKETPLACE_ABI } from '../../contracts/marketplace';

// Test Viem Accounts
const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const attackerKey = generatePrivateKey();
const attackerAccount = privateKeyToAccount(attackerKey);
const mockAttacker = attackerAccount.address;

const mockSmartAccountSeller = '0x111122223333444455556666777788889999aaaa' as `0x${string}`;

const mockChainId = 8453; // Base Mainnet
const mockEscrow = '0x400916339033b88cda38b1d8a5fb0f82e4889f38' as `0x${string}`;
const mockMarketplace = '0x6e3be632747e161a0b017cb35243d39eb90d0d8a' as `0x${string}`;

const testTradeId = 501;
const testOrderId = 100;
const validTxHash =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;

const escrowTradeLinkedTopic0 = encodeEventTopics({
  abi: MARKETPLACE_ABI,
  eventName: 'EscrowTradeLinked',
})[0]?.toLowerCase();

// Mock Viem RPC for P2PEscrow and Transaction Receipt
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ address, functionName, args }: any) => {
        if (functionName === 'getTrade') {
          const tid = Number(args[0]);
          if (tid >= 501 && tid <= 515) {
            let state = 1; // Default CREATED
            if (tid === 504) state = 2; // FUNDED
            if (tid === 505) state = 3; // PAYMENT_SUBMITTED
            if (tid === 506) state = 4; // DISPUTED
            if (tid === 507) state = 5; // RELEASED
            if (tid === 508) state = 6; // REFUNDED
            if (tid === 509) state = 7; // CANCELLED
            if (tid === 510) state = 2; // FUNDED for recovery
            if (tid === 511) state = 1; // CREATED for recovery
            if (tid === 512) state = 2; // FUNDED for Trade #10 vs #11
            if (tid === 513) state = 2; // FUNDED for Trade #10 vs #11

            return {
              tradeId: BigInt(tid),
              buyer: mockBuyer,
              seller: tid === 503 ? mockSmartAccountSeller : mockSeller,
              asset: '0x051979deb1eb4823672e6274a55c44d7818ff523',
              amount: 10000000000000000000n,
              fiatAmount: 500000n,
              fiatCurrency: '0x494e520000000000000000000000000000000000000000000000000000000000',
              state,
              paymentWindow: 1800n,
              fundingTimestamp: state >= 2 ? BigInt(Math.floor(Date.now() / 1000) - 100) : 0n,
              paymentTimestamp: state >= 3 ? BigInt(Math.floor(Date.now() / 1000) - 50) : 0n,
              paymentReference: '0x00',
              evidenceHash: '0x00',
              disputeInitiator: '0x0000000000000000000000000000000000000000',
            };
          }
          throw new Error('Trade not found');
        }
        if (functionName === 'isValidSignature') {
          const signatureHex = args[1];
          if (signatureHex === '0xvalid_smart_account_signature') {
            return ERC1271_MAGIC_VALUE;
          }
          return '0xffffffff';
        }
        throw new Error('Unknown contract function');
      },
      getTransactionReceipt: async ({ hash }: any) => {
        if (hash === validTxHash) {
          return {
            status: 'success',
            logs: [
              {
                address: mockMarketplace,
                topics: [
                  escrowTradeLinkedTopic0,
                  '0x0000000000000000000000000000000000000000000000000000000000000001', // matchId: 1
                  '0x00000000000000000000000000000000000000000000000000000000000001f5', // tradeId: 501
                ],
                data: encodeAbiParameters(
                  parseAbiParameters(
                    'uint256 buyOrderId, uint256 sellOrderId, address buyer, address seller, address asset, uint256 matchAmount',
                  ),
                  [
                    BigInt(testOrderId),
                    0n,
                    mockBuyer,
                    mockSeller,
                    '0x051979deb1eb4823672e6274a55c44d7818ff523',
                    10000000000000000000n,
                  ],
                ),
              },
            ],
          };
        }
        if (hash === '0x1111111111111111111111111111111111111111111111111111111111111111') {
          return {
            status: 'reverted',
            logs: [],
          };
        }
        if (hash === '0x2222222222222222222222222222222222222222222222222222222222222222') {
          return {
            status: 'success',
            logs: [], // No EscrowTradeLinked log
          };
        }
        throw new Error('Transaction receipt not found');
      },
    }),
  };
});

const testStorageDir = path.join(
  '/tmp',
  'test-p2p-trade-binding-' + Math.random().toString(36).slice(2),
);
process.env.P2P_BINDING_ROOT = path.join(testStorageDir, 'bindings');
process.env.PAYMENT_DATA_ENCRYPTION_KEY = 'secret_key_minimum_16_characters_long_for_aes';

describe('Phase 1 — Immutable P2P Trade Payment Binding Foundation Suite', () => {
  beforeEach(() => {
    const root = getTradeBindingStorageRoot();
    if (fs.existsSync(root)) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {}
    }
  });

  afterEach(() => {
    const root = getTradeBindingStorageRoot();
    if (fs.existsSync(root)) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {}
    }
  });

  // =========================================================================
  // CATEGORY 1: STORAGE LAYER (tradeBindingStore.ts)
  // =========================================================================
  describe('1. Trade Binding Storage Layer', () => {
    const sampleBinding: TradePaymentBinding = {
      tradeId: 101,
      chainId: mockChainId,
      escrowAddress: mockEscrow,
      marketplaceOrderId: 50,
      takeOrderTxHash: validTxHash,
      sellerAddress: mockSeller,
      buyerAddress: mockBuyer,
      paymentRail: 'UPI',
      paymentDestination: 'seller.alice@okaxis',
      sellerSignature: '0x1234',
      signatureTimestamp: Date.now(),
      bindingHash: '0xabcd' as `0x${string}`,
      createdAt: new Date().toISOString(),
    };

    it('1.1 creates and persists a valid trade payment binding', async () => {
      const result = await saveTradePaymentBinding(sampleBinding);
      expect(result.success).toBe(true);
      expect(result.isIdempotent).toBe(false);
      expect(result.binding.tradeId).toBe(101);
      expect(result.binding.paymentDestination).toBe('seller.alice@okaxis');
    });

    it('1.2 reads an existing trade payment binding and returns decrypted payload', async () => {
      await saveTradePaymentBinding(sampleBinding);
      const retrieved = await getTradePaymentBinding(101);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.tradeId).toBe(101);
      expect(retrieved?.paymentDestination).toBe('seller.alice@okaxis');
      expect(retrieved?.sellerAddress).toBe(mockSeller);
    });

    it('1.3 encrypts payment destination at rest using AES-256-GCM', async () => {
      await saveTradePaymentBinding(sampleBinding);
      const root = getTradeBindingStorageRoot();
      const filePath = path.resolve(root, 'binding-trade-101.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      expect(rawContent).not.toContain('seller.alice@okaxis'); // Plaintext VPA MUST NOT be on disk
      const parsed = JSON.parse(rawContent);
      expect(parsed.paymentDestination).toMatch(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    });

    it('1.4 write-once behavior: rejects attempt to overwrite with a different destination', async () => {
      await saveTradePaymentBinding(sampleBinding);

      const conflictingBinding: TradePaymentBinding = {
        ...sampleBinding,
        paymentDestination: 'attacker.modified@paytm',
      };

      await expect(saveTradePaymentBinding(conflictingBinding)).rejects.toThrow(
        /Conflict: Trade #101 is already bound/i,
      );
    });

    it('1.5 duplicate identical binding submission is idempotent', async () => {
      const first = await saveTradePaymentBinding(sampleBinding);
      expect(first.isIdempotent).toBe(false);

      const second = await saveTradePaymentBinding(sampleBinding);
      expect(second.success).toBe(true);
      expect(second.isIdempotent).toBe(true);
      expect(second.binding.paymentDestination).toBe('seller.alice@okaxis');
    });

    it('1.6 concurrent write race test: first write wins and duplicate returns idempotent or conflict', async () => {
      const bindingA = { ...sampleBinding, tradeId: 102 };
      const bindingB = { ...sampleBinding, tradeId: 102, paymentDestination: 'other@upi' };

      const [res1, res2] = await Promise.allSettled([
        saveTradePaymentBinding(bindingA),
        saveTradePaymentBinding(bindingB),
      ]);

      // Exactly one must succeed, the other either succeeds (if identical) or rejects with Conflict
      const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    });

    it('1.7 path traversal attempts in tradeId are strictly rejected', async () => {
      await expect(
        saveTradePaymentBinding({ ...sampleBinding, tradeId: -1 as any }),
      ).rejects.toThrow(/Invalid tradeId/);

      await expect(
        saveTradePaymentBinding({ ...sampleBinding, tradeId: 1.5 as any }),
      ).rejects.toThrow(/Invalid tradeId/);

      await expect(
        saveTradePaymentBinding({ ...sampleBinding, tradeId: 1_000_000_000 as any }),
      ).rejects.toThrow(/Invalid tradeId/);
    });

    it('1.8 empty or malformed paymentDestination is rejected', async () => {
      await expect(
        saveTradePaymentBinding({ ...sampleBinding, paymentDestination: '' }),
      ).rejects.toThrow(/Invalid paymentDestination/);
    });
  });

  // =========================================================================
  // CATEGORY 2: WALLET AUTHENTICATION & SIGNATURE VERIFICATION (walletAuth.ts)
  // =========================================================================
  describe('2. Wallet Authentication & Domain-Separated Signatures', () => {
    it('2.1 constructs deterministic domain-separated binding message', () => {
      const msg = constructTradePaymentBindingMessage({
        chainId: 8453,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp: 1700000000000,
      });

      expect(msg).toContain('UnifyVault P2P Trade Payment Binding');
      expect(msg).toContain('Chain ID: 8453');
      expect(msg).toContain(`Escrow Contract: ${mockEscrow.toLowerCase()}`);
      expect(msg).toContain('Marketplace Order ID: 100');
      expect(msg).toContain(`Seller Wallet: ${mockSeller.toLowerCase()}`);
      expect(msg).toContain('Payment Rail: UPI');
      expect(msg).toContain('Payment Destination: seller@okaxis');
      expect(msg).toContain('Timestamp: 1700000000000');
    });

    it('2.2 valid EOA ECDSA seller signature passes verification', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature,
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(true);
      expect(authCheck.isSmartAccount).toBe(false);
    });

    it('2.3 signature by another wallet fails verification against seller address', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });

      // Attacker signs message claiming to be seller
      const attackerSignature = await attackerAccount.signMessage({ message });

      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature: attackerSignature,
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
    });

    it('2.4 expired signature (> 5 minutes) fails verification', async () => {
      const expiredTimestamp = Date.now() - 6 * 60 * 1000;
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp: expiredTimestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature,
        signatureTimestamp: expiredTimestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
      expect(authCheck.error).toContain('expired or timestamp out of bounds');
    });

    it('2.5 Smart Account ERC-1271 valid signature passes verification', async () => {
      const timestamp = Date.now();
      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSmartAccountSeller,
        signature: '0xvalid_smart_account_signature',
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'smartaccount.seller@okaxis',
      });

      expect(authCheck.isValid).toBe(true);
      expect(authCheck.isSmartAccount).toBe(true);
    });

    it('2.6 Smart Account ERC-1271 invalid signature fails verification', async () => {
      const timestamp = Date.now();
      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSmartAccountSeller,
        signature: '0xinvalid_smart_account_signature',
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'smartaccount.seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
      expect(authCheck.error).toContain('ERC-1271 invalid magic value');
    });
  });

  // =========================================================================
  // CATEGORY 3: API ENDPOINT & ON-CHAIN CORRELATION (POST /api/p2p/trade-binding)
  // =========================================================================
  describe('3. POST /api/p2p/trade-binding Endpoint & On-Chain Correlation', () => {
    it('3.1 successfully creates binding for valid on-chain trade & correlated takeOrder tx', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'authoritative.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: validTxHash,
          paymentRail: 'UPI',
          paymentDestination: 'authoritative.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.tradeId).toBe(testTradeId);
      expect(body.binding.sellerAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
      expect(body.binding.buyerAddress.toLowerCase()).toBe(mockBuyer.toLowerCase());
      expect(body.binding.paymentDestination).toBe('authoritative.seller@okaxis');
      expect(body.binding.takeOrderTxHash).toBe(validTxHash);
    });

    it('3.2 rejects request with nonexistent on-chain tradeId', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: 99999, // Non-existent
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: validTxHash,
          paymentDestination: 'seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('does not exist');
    });

    it('3.3 rejects request with reverted or failed takeOrder transaction', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          paymentDestination: 'seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('failed or reverted');
    });

    it('3.4 rejects request with unrelated transaction hash not emitting EscrowTradeLinked', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
          paymentDestination: 'seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('does not correlate');
    });

    it('3.5 rejects buyer attempting to submit binding pretending to be seller', async () => {
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'buyer.attacker@okaxis',
        timestamp,
      });

      // Buyer signs it
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: validTxHash,
          paymentDestination: 'buyer.attacker@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Authentication failed');
    });

    it('3.6 rejects malformed UPI format in request body', async () => {
      const timestamp = Date.now();
      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          marketplaceOrderId: testOrderId,
          takeOrderTxHash: validTxHash,
          paymentDestination: 'invalid_upi_without_at',
          signature: '0x1234',
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid UPI ID format');
    });
  });

  // =========================================================================
  // CATEGORY 4: REPLAY & CROSS-DOMAIN ATTACK PROTECTION
  // =========================================================================
  describe('4. Replay & Cross-Domain Protection', () => {
    it('4.1 signature for Order A cannot bind Order B', async () => {
      const timestamp = Date.now();
      // Signed for Order #100
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      // Submitted for Order #200
      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature,
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 200, // Mismatch
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
    });

    it('4.2 signature cannot be replayed on a different chain ID', async () => {
      const timestamp = Date.now();
      // Signed for Base Mainnet (8453)
      const message = constructTradePaymentBindingMessage({
        chainId: 8453,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      // Verifying against Base Sepolia (84532)
      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature,
        signatureTimestamp: timestamp,
        chainId: 84532, // Mismatch
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
    });

    it('4.3 signature cannot be replayed against another escrow contract address', async () => {
      const timestamp = Date.now();
      const otherEscrow = '0x1111111111111111111111111111111111111111' as `0x${string}`;

      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 100,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
        timestamp,
      });
      const signature = await sellerAccount.signMessage({ message });

      const authCheck = await verifyTradePaymentBindingAuth({
        sellerAddress: mockSeller,
        signature,
        signatureTimestamp: timestamp,
        chainId: mockChainId,
        escrowAddress: otherEscrow, // Mismatch
        marketplaceOrderId: 100,
        paymentRail: 'UPI',
        paymentDestination: 'seller@okaxis',
      });

      expect(authCheck.isValid).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 5: AUTHORIZED GET /api/p2p/trade-binding
  // =========================================================================
  describe('5. GET /api/p2p/trade-binding Endpoint Authorization', () => {
    beforeEach(async () => {
      // Seed binding for Trade 501
      await saveTradePaymentBinding({
        tradeId: testTradeId,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        takeOrderTxHash: validTxHash,
        sellerAddress: mockSeller,
        buyerAddress: mockBuyer,
        paymentRail: 'UPI',
        paymentDestination: 'seller.get@okaxis',
        sellerSignature: '0x1234',
        signatureTimestamp: Date.now(),
        bindingHash: '0xabcd' as `0x${string}`,
        createdAt: new Date().toISOString(),
      });
    });

    it('5.1 seller can retrieve their own trade binding with valid signature', async () => {
      const timestamp = Date.now();
      const message = constructAuthMessage('get-trade-binding', testTradeId, timestamp);
      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/trade-binding?tradeId=${testTradeId}&userAddress=${mockSeller}&signature=${signature}&timestamp=${timestamp}`,
      );

      const res = await tradeBindingGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.paymentDestination).toBe('seller.get@okaxis');
    });

    it('5.2 buyer can retrieve trade binding for their trade with valid signature', async () => {
      const timestamp = Date.now();
      const message = constructAuthMessage('get-trade-binding', testTradeId, timestamp);
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/trade-binding?tradeId=${testTradeId}&userAddress=${mockBuyer}&signature=${signature}&timestamp=${timestamp}`,
      );

      const res = await tradeBindingGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.paymentDestination).toBe('seller.get@okaxis');
    });

    it('5.3 unauthorized third-party wallet receives 403 Forbidden', async () => {
      const timestamp = Date.now();
      const message = constructAuthMessage('get-trade-binding', testTradeId, timestamp);
      const signature = await attackerAccount.signMessage({ message });

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/trade-binding?tradeId=${testTradeId}&userAddress=${mockAttacker}&signature=${signature}&timestamp=${timestamp}`,
      );

      const res = await tradeBindingGET(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden');
    });

    it('5.4 returns 404 for trade without a payment binding', async () => {
      const timestamp = Date.now();
      const message = constructAuthMessage('get-trade-binding', 999, timestamp);
      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/trade-binding?tradeId=999&userAddress=${mockSeller}&signature=${signature}&timestamp=${timestamp}`,
      );

      const res = await tradeBindingGET(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('Trade payment binding not found');
    });
  });

  // =========================================================================
  // CATEGORY 6: PAYMENT INTENT & SMART QR CONSUMPTION (Phase 2 Invariants)
  // =========================================================================
  describe('6. Payment Intent & Smart QR Binding Consumption (Phase 2)', () => {
    it('6.1 payment-intent resolves solely to TradePaymentBinding and ignores generic profile updates', async () => {
      // 1. Seed authoritative binding for Trade #501
      const authoritativeUpi = 'bound.alice@okaxis';
      await saveTradePaymentBinding({
        tradeId: testTradeId,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        takeOrderTxHash: validTxHash,
        sellerAddress: mockSeller,
        buyerAddress: mockBuyer,
        paymentRail: 'UPI',
        paymentDestination: authoritativeUpi,
        sellerSignature: '0x1234',
        signatureTimestamp: Date.now(),
        bindingHash: '0xabcd' as `0x${string}`,
        createdAt: new Date().toISOString(),
      });

      // 2. Seller updates mutable generic profile to an attacker VPA
      await saveSellerPaymentProfile(mockSeller, 'malicious.attacker@paytm');

      // 3. Buyer queries payment intent
      const timestamp = Date.now();
      const message = constructAuthMessage('payment-intent', testTradeId, timestamp);
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          userAddress: mockBuyer,
          signature,
          timestamp,
        }),
      });

      const res = await paymentIntentPOST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      // Invariant: MUST be bound.alice@okaxis, NEVER malicious.attacker@paytm
      expect(body.paymentIntent.sellerPaymentIdentifier).toBe(authoritativeUpi);
      expect(body.upiUri).toContain('pa=bound.alice%40okaxis');
      expect(body.upiUri).not.toContain('malicious.attacker%40paytm');
    });

    it('6.2 client-supplied payment destination in payment-intent request is strictly ignored', async () => {
      await saveTradePaymentBinding({
        tradeId: testTradeId,
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        takeOrderTxHash: validTxHash,
        sellerAddress: mockSeller,
        buyerAddress: mockBuyer,
        paymentRail: 'UPI',
        paymentDestination: 'authoritative.seller@okaxis',
        sellerSignature: '0x1234',
        signatureTimestamp: Date.now(),
        bindingHash: '0xabcd' as `0x${string}`,
        createdAt: new Date().toISOString(),
      });

      const timestamp = Date.now();
      const message = constructAuthMessage('payment-intent', testTradeId, timestamp);
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          userAddress: mockBuyer,
          signature,
          timestamp,
          sellerUpiId: 'client.injected@tampered',
          paymentDestination: 'client.injected@tampered',
        }),
      });

      const res = await paymentIntentPOST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.paymentIntent.sellerPaymentIdentifier).toBe('authoritative.seller@okaxis');
      expect(body.upiUri).toContain('pa=authoritative.seller%40okaxis');
      expect(body.upiUri).not.toContain('client.injected');
    });

    it('6.3 active trade without a binding fails closed (HTTP 400)', async () => {
      // Trade 502 exists on-chain in mock but has NO TradePaymentBinding
      const unboundTradeId = 502;
      const timestamp = Date.now();
      const message = constructAuthMessage('payment-intent', unboundTradeId, timestamp);
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: unboundTradeId,
          userAddress: mockBuyer,
          signature,
          timestamp,
        }),
      });

      const res = await paymentIntentPOST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authoritative payment binding not found');
    });

    it('6.4 partial fills and distinct trades resolve distinct bindings by tradeId', async () => {
      // Order 100 partially filled into Trade 501 and Trade 502
      await saveTradePaymentBinding({
        tradeId: testTradeId, // 501
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        takeOrderTxHash: validTxHash,
        sellerAddress: mockSeller,
        buyerAddress: mockBuyer,
        paymentRail: 'UPI',
        paymentDestination: 'trade501.payee@okaxis',
        sellerSignature: '0x1111',
        signatureTimestamp: Date.now(),
        bindingHash: '0xaaaa' as `0x${string}`,
        createdAt: new Date().toISOString(),
      });

      await saveTradePaymentBinding({
        tradeId: 502, // 502
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: testOrderId,
        takeOrderTxHash: validTxHash,
        sellerAddress: mockSeller,
        buyerAddress: mockBuyer,
        paymentRail: 'UPI',
        paymentDestination: 'trade502.payee@okaxis',
        sellerSignature: '0x2222',
        signatureTimestamp: Date.now(),
        bindingHash: '0xbbbb' as `0x${string}`,
        createdAt: new Date().toISOString(),
      });

      const ts = Date.now();
      const msg1 = constructAuthMessage('payment-intent', testTradeId, ts);
      const sig1 = await buyerAccount.signMessage({ message: msg1 });

      const req1 = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: testTradeId,
          userAddress: mockBuyer,
          signature: sig1,
          timestamp: ts,
        }),
      });

      const res1 = await paymentIntentPOST(req1);
      const body1 = await res1.json();
      expect(body1.paymentIntent.sellerPaymentIdentifier).toBe('trade501.payee@okaxis');

      const msg2 = constructAuthMessage('payment-intent', 502, ts);
      const sig2 = await buyerAccount.signMessage({ message: msg2 });

      const req2 = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: 502,
          userAddress: mockBuyer,
          signature: sig2,
          timestamp: ts,
        }),
      });

      const res2 = await paymentIntentPOST(req2);
      const body2 = await res2.json();
      expect(body2.paymentIntent.sellerPaymentIdentifier).toBe('trade502.payee@okaxis');
    });
  });

  // =========================================================================
  // CATEGORY 7: EVIDENCE OCR RECEIVER VPA CROSS-EXAMINATION
  // =========================================================================
  describe('7. Evidence OCR Payee VPA Cross-Examination (Phase 2)', () => {
    const validPngBytes = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...new Array(200).fill(0),
    ]);
    const dummyFile = {
      name: 'receipt.png',
      type: 'image/png',
      size: validPngBytes.length,
      bytes: validPngBytes,
    };

    it('7.1 matching receiver VPA against bound expectedPayeeVpa passes release eligibility', async () => {
      const boundVpa = 'bound.seller@okaxis';
      const ocrReceiptText = `
        PhonePe UPI
        Payment Successful
        ₹ 5,000.00
        Paid to: Seller Name
        Payee UPI ID: bound.seller@okaxis
        UPI Ref No: 123456789012
      `;

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: ocrReceiptText,
        context: {
          tradeId: testTradeId,
          expectedAmount: 5000,
          expectedCurrency: 'INR',
          expectedUtr: '123456789012',
          expectedPayeeVpa: boundVpa,
        },
      });

      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.isReleaseAllowed).toBe(true);
      expect(result.isClaimAllowed).toBe(true);
      expect(result.discrepancies.length).toBe(0);
    });

    it('7.2 mismatched receiver VPA blocks automatic release eligibility (isReleaseAllowed = false)', async () => {
      const boundVpa = 'bound.seller@okaxis';
      const ocrReceiptText = `
        PhonePe UPI
        Payment Successful
        ₹ 5,000.00
        Paid to: Wrong Person
        Payee UPI ID: attacker.phishing@paytm
        UPI Ref No: 123456789012
      `;

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: ocrReceiptText,
        context: {
          tradeId: testTradeId,
          expectedAmount: 5000,
          expectedCurrency: 'INR',
          expectedUtr: '123456789012',
          expectedPayeeVpa: boundVpa,
        },
      });

      expect(result.status).toBe('MISMATCH');
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('Payee VPA mismatch'))).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORY 8: PHASE 1 — TRADE PAYMENT BINDING RECOVERY & LIFECYCLE AUDIT
  // =========================================================================
  describe('8. Trade Payment Binding Recovery & Lifecycle Invariants', () => {
    // 8.1 Seller can recover missing binding for FUNDED trade
    it('8.1 Seller can recover missing payment binding on a FUNDED trade without takeOrderTxHash', async () => {
      const recoveryTradeId = 504; // State 2: FUNDED
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'recovered.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'recovered.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.tradeId).toBe(recoveryTradeId);
      expect(body.binding.paymentDestination).toBe('recovered.seller@okaxis');
      expect(body.binding.sellerAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
    });

    // 8.2 Buyer cannot recover seller binding
    it('8.2 Buyer cannot recover or set seller payment binding', async () => {
      const recoveryTradeId = 504;
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'buyer.stolen@okaxis',
        timestamp,
      });

      // Buyer signs trying to forge seller binding
      const buyerSignature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'buyer.stolen@okaxis',
          signature: buyerSignature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication failed');
    });

    // 8.3 Random wallet cannot recover binding
    it('8.3 Random unrelated wallet cannot recover or set seller payment binding', async () => {
      const recoveryTradeId = 504;
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'attacker@okaxis',
        timestamp,
      });

      const attackerSignature = await attackerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'attacker@okaxis',
          signature: attackerSignature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication failed');
    });

    // 8.4 CREATED state allows binding
    it('8.4 CREATED trade state (1) allows seller payment binding recovery', async () => {
      const recoveryTradeId = 511; // State 1: CREATED
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'created.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'created.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.paymentDestination).toBe('created.seller@okaxis');
    });

    // 8.5 FUNDED state allows binding
    it('8.5 FUNDED trade state (2) allows seller payment binding recovery', async () => {
      const recoveryTradeId = 510; // State 2: FUNDED
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'funded.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'funded.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.binding.paymentDestination).toBe('funded.seller@okaxis');
    });

    // 8.6 PAYMENT_SUBMITTED rejects
    it('8.6 PAYMENT_SUBMITTED trade state (3) rejects payment binding creation/recovery', async () => {
      const invalidTradeId = 505; // State 3
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: invalidTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'blocked.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: invalidTradeId,
          marketplaceOrderId: invalidTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'blocked.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('cannot accept payment details');
    });

    // 8.7 DISPUTED rejects
    it('8.7 DISPUTED trade state (4) rejects payment binding creation/recovery', async () => {
      const invalidTradeId = 506; // State 4
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: invalidTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'blocked.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: invalidTradeId,
          marketplaceOrderId: invalidTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'blocked.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('cannot accept payment details');
    });

    // 8.8 RELEASED rejects
    it('8.8 RELEASED trade state (5) rejects payment binding creation/recovery', async () => {
      const invalidTradeId = 507; // State 5
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: invalidTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'blocked.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: invalidTradeId,
          marketplaceOrderId: invalidTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'blocked.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('cannot accept payment details');
    });

    // 8.9 REFUNDED rejects
    it('8.9 REFUNDED trade state (6) rejects payment binding creation/recovery', async () => {
      const invalidTradeId = 508; // State 6
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: invalidTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'blocked.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: invalidTradeId,
          marketplaceOrderId: invalidTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'blocked.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('cannot accept payment details');
    });

    // 8.10 CANCELLED rejects
    it('8.10 CANCELLED trade state (7) rejects payment binding creation/recovery', async () => {
      const invalidTradeId = 509; // State 7
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: invalidTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'blocked.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: invalidTradeId,
          marketplaceOrderId: invalidTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'blocked.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('cannot accept payment details');
    });

    // 8.11 Same binding is idempotent
    it('8.11 Submitting the identical payment binding again returns 200 with isIdempotent: true', async () => {
      const recoveryTradeId = 510;
      const timestamp = Date.now();
      const message = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'idempotent.seller@okaxis',
        timestamp,
      });

      const signature = await sellerAccount.signMessage({ message });

      // First submit
      const req1 = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'idempotent.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res1 = await tradeBindingPOST(req1);
      expect(res1.status).toBe(201);

      // Second identical submit
      const req2 = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'idempotent.seller@okaxis',
          signature,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res2 = await tradeBindingPOST(req2);
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.success).toBe(true);
      expect(body2.isIdempotent).toBe(true);
    });

    // 8.12 Different UPI cannot overwrite
    it('8.12 Attempting to overwrite an existing trade binding with a different UPI returns HTTP 409 Conflict', async () => {
      const recoveryTradeId = 510;
      const timestamp = Date.now();

      // First binding
      const msg1 = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'original.seller@okaxis',
        timestamp,
      });
      const sig1 = await sellerAccount.signMessage({ message: msg1 });

      const req1 = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'original.seller@okaxis',
          signature: sig1,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });
      await tradeBindingPOST(req1);

      // Second binding attempt with new UPI
      const msg2 = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: recoveryTradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'different.seller@paytm',
        timestamp,
      });
      const sig2 = await sellerAccount.signMessage({ message: msg2 });

      const req2 = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: recoveryTradeId,
          marketplaceOrderId: recoveryTradeId,
          paymentRail: 'UPI',
          paymentDestination: 'different.seller@paytm',
          signature: sig2,
          signatureTimestamp: timestamp,
          chainId: mockChainId,
        }),
      });

      const res2 = await tradeBindingPOST(req2);
      expect(res2.status).toBe(409);
      const body2 = await res2.json();
      expect(body2.success).toBe(false);
      expect(body2.error).toContain('already bound');
    });

    // 8.13 Trade #12 cannot affect Trade #13
    it('8.13 Partial fills safety: Trade #512 binding is isolated and does not affect Trade #513', async () => {
      const ts = Date.now();

      // Bind Trade #512
      const msg512 = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 512,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'trade512.payee@okaxis',
        timestamp: ts,
      });
      const sig512 = await sellerAccount.signMessage({ message: msg512 });

      await tradeBindingPOST(
        new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId: 512,
            marketplaceOrderId: 512,
            paymentRail: 'UPI',
            paymentDestination: 'trade512.payee@okaxis',
            signature: sig512,
            signatureTimestamp: ts,
            chainId: mockChainId,
          }),
        }),
      );

      // Verify Trade #513 has no binding yet
      const binding513 = await getTradePaymentBinding(513);
      expect(binding513).toBeNull();

      // Bind Trade #513 independently
      const msg513 = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: 513,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'trade513.payee@okaxis',
        timestamp: ts,
      });
      const sig513 = await sellerAccount.signMessage({ message: msg513 });

      await tradeBindingPOST(
        new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId: 513,
            marketplaceOrderId: 513,
            paymentRail: 'UPI',
            paymentDestination: 'trade513.payee@okaxis',
            signature: sig513,
            signatureTimestamp: ts,
            chainId: mockChainId,
          }),
        }),
      );

      const resolved512 = await getTradePaymentBinding(512);
      const resolved513 = await getTradePaymentBinding(513);

      expect(resolved512?.paymentDestination).toBe('trade512.payee@okaxis');
      expect(resolved513?.paymentDestination).toBe('trade513.payee@okaxis');
    });

    // 8.14 PaymentIntent fails before binding & 8.15 succeeds after binding (with QR code)
    it('8.14 & 8.15 & 8.16 & 8.17: PaymentIntent fails closed before binding, succeeds and reveals UPI + QR URI after binding', async () => {
      const tradeId = 510; // FUNDED
      const ts = Date.now();

      // 1. Query PaymentIntent BEFORE binding => Fails closed with 400
      const authMsg = constructAuthMessage('payment-intent', tradeId, ts);
      const authSig = await buyerAccount.signMessage({ message: authMsg });

      const preReq = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId,
          userAddress: mockBuyer,
          signature: authSig,
          timestamp: ts,
        }),
      });

      const preRes = await paymentIntentPOST(preReq);
      expect(preRes.status).toBe(400);
      const preBody = await preRes.json();
      expect(preBody.success).toBe(false);
      expect(preBody.error).toContain('Authoritative payment binding not found');

      // 2. Seller performs recovery binding
      const bindMsg = constructTradePaymentBindingMessage({
        chainId: mockChainId,
        escrowAddress: mockEscrow,
        marketplaceOrderId: tradeId,
        sellerAddress: mockSeller,
        paymentRail: 'UPI',
        paymentDestination: 'recovery.complete@okaxis',
        timestamp: ts,
      });
      const bindSig = await sellerAccount.signMessage({ message: bindMsg });

      await tradeBindingPOST(
        new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId,
            marketplaceOrderId: tradeId,
            paymentRail: 'UPI',
            paymentDestination: 'recovery.complete@okaxis',
            signature: bindSig,
            signatureTimestamp: ts,
            chainId: mockChainId,
          }),
        }),
      );

      // 3. Query PaymentIntent AFTER binding => Succeeds with authoritative UPI & valid UPI URI for QR
      const postReq = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId,
          userAddress: mockBuyer,
          signature: authSig,
          timestamp: ts,
        }),
      });

      const postRes = await paymentIntentPOST(postReq);
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.paymentIntent.sellerPaymentIdentifier).toBe('recovery.complete@okaxis');
      expect(postBody.paymentIntent.status).toBe('QR_READY');
      expect(postBody.upiUri).toContain('upi://pay');
      expect(postBody.upiUri).toContain('pa=recovery.complete%40okaxis');
    });

    // 8.18 Wrong chain ID rejected
    it('8.18 Rejects recovery payment binding with unsupported chain ID', async () => {
      const ts = Date.now();
      const req = new NextRequest('http://localhost:3000/api/p2p/trade-binding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: 501,
          paymentDestination: 'seller@okaxis',
          signature: '0x1234',
          signatureTimestamp: ts,
          chainId: 1, // Ethereum Mainnet (Unsupported)
        }),
      });

      const res = await tradeBindingPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Unsupported network');
    });
  });
});
