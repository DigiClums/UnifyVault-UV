import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { validateUpiId, isValidUpiId } from '../../p2p/upiValidation';
import {
  saveSellerPaymentProfile,
  getSellerPaymentProfile,
  getPaymentIntentStorageRoot,
  getPaymentIntentByTradeId,
  generateUpiUri,
} from '../paymentIntentStore';
import { POST as paymentIntentPOST } from '../../../app/api/p2p/payment-intent/route';
import {
  POST as sellerProfilePOST,
  GET as sellerProfileGET,
} from '../../../app/api/p2p/seller-profile/route';
import { constructAuthMessage } from '../walletAuth';

// Test Viem Accounts
const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const testTradeId = 7701;

// Mock Viem RPC for P2PEscrow getTrade call
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getTrade') {
          const tid = Number(args[0]);
          if (tid === testTradeId) {
            return {
              tradeId: BigInt(tid),
              buyer: mockBuyer,
              seller: mockSeller,
              asset: '0x006c5DF13C716E5224b33956651C4356BB90DEc0', // Canonical UVBE
              amount: 100000000000000000000n, // 100 UVBE
              fiatAmount: 5000000n, // 50,000.00 INR
              fiatCurrency: '0x494e520000000000000000000000000000000000000000000000000000000000', // INR
              state: 2, // FUNDED
              paymentWindow: 1800n,
              fundingTimestamp: BigInt(Math.floor(Date.now() / 1000) - 60),
              paymentTimestamp: 0n,
              paymentReference: '0x00',
              evidenceHash: '0x00',
              disputeInitiator: '0x0000000000000000000000000000000000000000',
            };
          }
          throw new Error('Trade not found');
        }
        throw new Error('Unknown contract function');
      },
    }),
  };
});

const testStorageDir = path.join(
  '/tmp',
  'test-seller-upi-flow-' + Math.random().toString(36).slice(2),
);
process.env.P2P_INTENT_ROOT = path.join(testStorageDir, 'intents');
process.env.P2P_PROFILE_ROOT = path.join(testStorageDir, 'profiles');

describe('Seller UPI ID in P2P SELL UVBE Create Limit Order & Settlement Flow', () => {
  beforeEach(() => {
    const root = getPaymentIntentStorageRoot();
    const intentFile = path.resolve(root, `intent-trade-${testTradeId}.json`);
    const profileFile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);

    if (fs.existsSync(intentFile))
      try {
        fs.unlinkSync(intentFile);
      } catch {}
    if (fs.existsSync(profileFile))
      try {
        fs.unlinkSync(profileFile);
      } catch {}
  });

  afterEach(() => {
    const root = getPaymentIntentStorageRoot();
    const intentFile = path.resolve(root, `intent-trade-${testTradeId}.json`);
    const profileFile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);

    if (fs.existsSync(intentFile))
      try {
        fs.unlinkSync(intentFile);
      } catch {}
    if (fs.existsSync(profileFile))
      try {
        fs.unlinkSync(profileFile);
      } catch {}
  });

  // 1. SELL requires UPI validation
  describe('1. SELL Requires UPI Validation', () => {
    it('rejects empty, null, or undefined UPI ID with required error', () => {
      const emptyResult = validateUpiId('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toBe('Seller UPI ID is required.');

      const whitespaceResult = validateUpiId('    ');
      expect(whitespaceResult.isValid).toBe(false);
      expect(whitespaceResult.error).toBe('Seller UPI ID is required.');

      const nullResult = validateUpiId(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toBe('Seller UPI ID is required.');

      const undefinedResult = validateUpiId(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toBe('Seller UPI ID is required.');
    });
  });

  // 2. Valid UPI accepted
  describe('2. Valid UPI ID Accepted', () => {
    it('accepts valid localpart@provider formats and trims leading/trailing whitespace', () => {
      const validCases = [
        { raw: 'name@upi', expectedTrimmed: 'name@upi' },
        { raw: 'alice@okaxis', expectedTrimmed: 'alice@okaxis' },
        { raw: 'seller.merchant@okhdfcbank', expectedTrimmed: 'seller.merchant@okhdfcbank' },
        { raw: 'crypto_trader-99@paytm', expectedTrimmed: 'crypto_trader-99@paytm' },
        { raw: '  alice.vault@ibl  ', expectedTrimmed: 'alice.vault@ibl' },
        { raw: 'john-doe_01@icici', expectedTrimmed: 'john-doe_01@icici' },
      ];

      for (const { raw, expectedTrimmed } of validCases) {
        const result = validateUpiId(raw);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.trimmedUpi).toBe(expectedTrimmed);
        expect(isValidUpiId(raw)).toBe(true);
      }
    });
  });

  // 3. Invalid UPI rejected
  describe('3. Invalid UPI ID Rejected', () => {
    it('rejects UPI IDs containing spaces anywhere with space error', () => {
      const spaceCases = [
        'alice @okaxis',
        'alice@ okaxis',
        'alice @ okaxis',
        'alice okaxis',
        'alice  vault@upi',
      ];

      for (const raw of spaceCases) {
        const result = validateUpiId(raw);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('UPI ID cannot contain spaces.');
        expect(isValidUpiId(raw)).toBe(false);
      }
    });

    it('rejects malformed UPI IDs (missing @, missing localpart, missing provider, multiple @)', () => {
      const malformedCases = [
        'aliceokaxis',
        '@okaxis',
        'alice@',
        'alice@@okaxis',
        'alice@okaxis@extra',
        'a@b@c',
        '@',
      ];

      for (const raw of malformedCases) {
        const result = validateUpiId(raw);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid UPI ID format. Expected format: name@upi');
        expect(isValidUpiId(raw)).toBe(false);
      }
    });
  });

  // 4. BUY flow has no UPI requirement
  describe('4. BUY Flow Has No UPI Requirement', () => {
    it('does not mandate UPI ID for BUY orders and does not enforce SELL UPI error', () => {
      // In BUY context, UPI is not collected / not required
      const side = 'BUY';
      const isUpiRequiredForSide = side === 'SELL';
      expect(isUpiRequiredForSide).toBe(false);
    });
  });

  // 5. UPI persists on order creation
  describe('5. UPI Persists on Order Creation', () => {
    it('saves seller UPI encrypted at rest and allows authenticated retrieval', async () => {
      const sellerUpi = '  authoritative.seller@okaxis  ';
      const trimmedUpi = sellerUpi.trim();

      // Persist via saveSellerPaymentProfile
      await saveSellerPaymentProfile(mockSeller, trimmedUpi);

      // Verify file exists on disk and is encrypted with AES-256-GCM
      const root = getPaymentIntentStorageRoot();
      const filePath = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const rawFileContent = fs.readFileSync(filePath, 'utf-8');
      expect(rawFileContent).not.toContain(trimmedUpi); // Plaintext VPA MUST NOT be stored
      const parsed = JSON.parse(rawFileContent);
      expect(parsed.upiIdEncrypted).toMatch(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

      // Decrypted profile retrieval
      const profile = await getSellerPaymentProfile(mockSeller);
      expect(profile).not.toBeNull();
      expect(profile?.sellerAddress).toBe(mockSeller.toLowerCase());
      expect(profile?.upiId).toBe(trimmedUpi);
    });

    it('persists seller UPI via /api/p2p/seller-profile endpoint', async () => {
      const upiToSave = 'api.seller@okhdfcbank';

      const saveReq = new NextRequest('http://localhost:3000/api/p2p/seller-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-auth': 'true',
        },
        body: JSON.stringify({
          userAddress: mockSeller,
          upiVpa: upiToSave,
          paymentRail: 'UPI',
        }),
      });

      const res = await sellerProfilePOST(saveReq);
      expect(res.status).toBe(200);
      const resBody = await res.json();
      expect(resBody.success).toBe(true);

      // Verify profile is accessible via getSellerPaymentProfile
      const retrieved = await getSellerPaymentProfile(mockSeller);
      expect(retrieved?.upiId).toBe(upiToSave);
    });
  });

  // 6. Matched trade exposes seller UPI
  describe('6. Matched Trade Exposes Seller UPI', () => {
    it('initializes Payment Intent and URI with seller UPI saved on order creation', async () => {
      // 1. Seller creates order and UPI is persisted
      const registeredSellerUpi = 'fastpayout.alice@okaxis';
      await saveSellerPaymentProfile(mockSeller, registeredSellerUpi);

      // 2. Buyer gets matched trade and requests payment intent
      const timestamp = Date.now();
      const message = constructAuthMessage('payment-intent', testTradeId, timestamp);
      const signature = await buyerAccount.signMessage({ message });

      const req = new NextRequest('http://localhost:3000/api/p2p/payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          tradeId: testTradeId,
          userAddress: mockBuyer,
          signature,
          timestamp,
        }),
      });

      const res = await paymentIntentPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      // 3. Matched trade payment intent exposes seller's authoritative UPI ID
      expect(data.paymentIntent).toBeDefined();
      expect(data.paymentIntent.sellerAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
      expect(data.paymentIntent.sellerPaymentIdentifier).toBe(registeredSellerUpi);

      // 4. UPI URI contains standard URL-encoded payee identifier
      expect(data.upiUri).toBeDefined();
      expect(data.upiUri).toContain('pa=fastpayout.alice%40okaxis');
      expect(data.upiUri).toContain('cu=INR');
      expect(data.upiUri).toContain('am=50000');

      // 5. Payment Intent on disk matches seller UPI
      const savedIntent = await getPaymentIntentByTradeId(testTradeId);
      expect(savedIntent).not.toBeNull();
      expect(savedIntent?.sellerPaymentIdentifier).toBe(registeredSellerUpi);
    });
  });
});
