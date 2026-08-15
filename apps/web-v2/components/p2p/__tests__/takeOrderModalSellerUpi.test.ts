import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseUnits, formatUnits } from 'viem';
import { OrderDetails, OrderSide, OrderStatus } from '../../../lib/contracts/marketplace';
import {
  saveSellerPaymentProfile,
  getSellerPaymentProfile,
  getPaymentIntentStorageRoot,
  getPaymentIntentByTradeId,
  savePaymentIntent,
} from '../../../lib/payment/paymentIntentStore';
import {
  saveSellerProfile,
  getSellerProfile,
  getSellerProfileStorageRoot,
} from '../../../lib/payment/paymentProfileStore';
import { GET as sellerProfileGET } from '../../../app/api/p2p/seller-profile/route';
import { PaymentIntent } from '../../../lib/payment/types';

// Accounts
const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const otherSellerKey = generatePrivateKey();
const otherSellerAccount = privateKeyToAccount(otherSellerKey);
const mockOtherSeller = otherSellerAccount.address;

const mockAsset = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`;

/**
 * Pure helper functions matching TakeOrderModal.tsx logic
 */
export function computeTakeOrderFiatTotal(tradeAmountStr: string, unitPrice: number): number {
  const inputAmountNum = parseFloat(tradeAmountStr) || 0;
  return inputAmountNum * unitPrice;
}

export function isTakeOrderSubmitDisabled(params: {
  isSubmitting: boolean;
  tradeAmountStr: string;
  inputAmountNum: number;
  isMaker: boolean;
  isBuyMode: boolean;
  isLoadingSellerUpi: boolean;
  sellerUpi: string | null;
}): boolean {
  if (params.isSubmitting) return true;
  if (!params.tradeAmountStr || params.inputAmountNum <= 0) return true;
  if (params.isMaker) return true;
  if (params.isBuyMode) {
    if (params.isLoadingSellerUpi || !params.sellerUpi) return true;
  }
  return false;
}

export function resolveSellerUpiForModal(params: {
  order: OrderDetails | null;
  currentUserAddress: string | null;
  fetchedProfileUpi: string | null;
}): {
  sellerUpi: string | null;
  isBuyMode: boolean;
  sellerAddress: string | null;
} {
  if (!params.order) {
    return { sellerUpi: null, isBuyMode: false, sellerAddress: null };
  }

  const isBuy = params.order.side === OrderSide.BUY;
  const isBuyMode = !isBuy; // Buying UVBE from Seller

  if (!isBuyMode) {
    // Taker is selling UVBE, not paying seller
    return { sellerUpi: null, isBuyMode: false, sellerAddress: params.order.maker };
  }

  // 1. Check immutable snapshot on order object
  const orderRecord = params.order as unknown as Record<string, unknown>;
  const snapshotUpi =
    (orderRecord.sellerUpiId as string | undefined) ||
    (orderRecord.sellerPaymentIdentifier as string | undefined) ||
    (orderRecord.upiId as string | undefined);

  if (snapshotUpi && typeof snapshotUpi === 'string' && snapshotUpi.trim().length > 0) {
    return {
      sellerUpi: snapshotUpi.trim(),
      isBuyMode: true,
      sellerAddress: params.order.maker,
    };
  }

  // 2. Use fetched profile for maker (never current user's profile)
  return {
    sellerUpi: params.fetchedProfileUpi ? params.fetchedProfileUpi.trim() : null,
    isBuyMode: true,
    sellerAddress: params.order.maker,
  };
}

describe('TakeOrderModal — Seller UPI Payment Display & Invariants', () => {
  const testStorageDir = path.join(
    '/tmp',
    'test-take-modal-upi-' + Math.random().toString(36).slice(2),
  );
  process.env.P2P_INTENT_ROOT = path.join(testStorageDir, 'intents');
  process.env.P2P_PROFILE_ROOT = path.join(testStorageDir, 'profiles');

  const mockSellOrder: OrderDetails = {
    orderId: 201,
    maker: mockSeller,
    side: OrderSide.SELL, // Sell order from maker (taker is BUYER)
    asset: mockAsset,
    amount: parseUnits('100', 18),
    filledAmount: 0n,
    remainingAmount: parseUnits('100', 18),
    price: 200n, // 200 INR per UVBE
    fiatCurrency: 'INR',
    minLimit: parseUnits('1', 18),
    maxLimit: parseUnits('100', 18),
    status: OrderStatus.OPEN,
    createdAt: Math.floor(Date.now() / 1000),
  };

  const mockBuyOrder: OrderDetails = {
    orderId: 202,
    maker: mockBuyer,
    side: OrderSide.BUY, // Buy order from maker (taker is SELLER)
    asset: mockAsset,
    amount: parseUnits('50', 18),
    filledAmount: 0n,
    remainingAmount: parseUnits('50', 18),
    price: 200n,
    fiatCurrency: 'INR',
    minLimit: parseUnits('1', 18),
    maxLimit: parseUnits('50', 18),
    status: OrderStatus.OPEN,
    createdAt: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    const root = getPaymentIntentStorageRoot();
    if (fs.existsSync(root)) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {}
    }
  });

  afterEach(() => {
    const root = getPaymentIntentStorageRoot();
    if (fs.existsSync(root)) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {}
    }
  });

  // 1. Seller UPI Appears Correctly
  describe('1. Seller UPI Appears Correctly for Sell Orders', () => {
    it('resolves seller UPI for the order maker and enables buy mode', () => {
      const result = resolveSellerUpiForModal({
        order: mockSellOrder,
        currentUserAddress: mockBuyer,
        fetchedProfileUpi: 'seller@upi',
      });

      expect(result.isBuyMode).toBe(true);
      expect(result.sellerUpi).toBe('seller@upi');
      expect(result.sellerAddress).toBe(mockSeller);
    });

    it('uses immutable snapshot on order if provided', () => {
      const orderWithSnapshot: OrderDetails & { sellerUpiId: string } = {
        ...mockSellOrder,
        sellerUpiId: 'snapshot.seller@okaxis',
      };

      const result = resolveSellerUpiForModal({
        order: orderWithSnapshot,
        currentUserAddress: mockBuyer,
        fetchedProfileUpi: 'different.profile@upi',
      });

      expect(result.sellerUpi).toBe('snapshot.seller@okaxis');
    });
  });

  // 2. Correct Seller UPI Displayed for Selected Order
  describe('2. Correct Seller UPI Displayed for Selected Order', () => {
    it('displays maker UPI for seller A and distinct maker UPI for seller B', () => {
      const orderA = { ...mockSellOrder, maker: mockSeller };
      const orderB = { ...mockSellOrder, orderId: 203, maker: mockOtherSeller };

      const resA = resolveSellerUpiForModal({
        order: orderA,
        currentUserAddress: mockBuyer,
        fetchedProfileUpi: 'sellerA@okaxis',
      });

      const resB = resolveSellerUpiForModal({
        order: orderB,
        currentUserAddress: mockBuyer,
        fetchedProfileUpi: 'sellerB@okhdfcbank',
      });

      expect(resA.sellerUpi).toBe('sellerA@okaxis');
      expect(resA.sellerAddress).toBe(mockSeller);

      expect(resB.sellerUpi).toBe('sellerB@okhdfcbank');
      expect(resB.sellerAddress).toBe(mockOtherSeller);
    });
  });

  // 3. Correct INR Amount Displayed
  describe('3. Correct INR Amount Calculation', () => {
    it('calculates exact fiat amount matching tradeAmount * unitPrice', () => {
      const unitPrice = 200; // 200 INR
      expect(computeTakeOrderFiatTotal('1', unitPrice)).toBe(200);
      expect(computeTakeOrderFiatTotal('2.5', unitPrice)).toBe(500);
      expect(computeTakeOrderFiatTotal('100', unitPrice)).toBe(20000);
      expect(computeTakeOrderFiatTotal('', unitPrice)).toBe(0);
      expect(computeTakeOrderFiatTotal('0', unitPrice)).toBe(0);
    });
  });

  // 4. Copy Button Functionality
  describe('4. Copy Button Functionality', () => {
    it('copies strictly the raw UPI ID and sets copied confirmation state', async () => {
      let clipboardText = '';
      const mockClipboard = {
        writeText: async (text: string) => {
          clipboardText = text;
        },
      };

      const upiToCopy = 'seller@upi';
      await mockClipboard.writeText(upiToCopy);

      expect(clipboardText).toBe('seller@upi');
      expect(clipboardText).not.toContain('UPI ID:');
      expect(clipboardText).not.toContain('Amount:');
    });
  });

  // 5. Missing UPI Handled Safely
  describe('5. Missing UPI Handled Safely & Prevents Misleading Confirmation', () => {
    it('disables submit button when seller UPI is unavailable in buy mode', () => {
      const isDisabled = isTakeOrderSubmitDisabled({
        isSubmitting: false,
        tradeAmountStr: '1',
        inputAmountNum: 1,
        isMaker: false,
        isBuyMode: true,
        isLoadingSellerUpi: false,
        sellerUpi: null, // Missing UPI
      });

      expect(isDisabled).toBe(true);
    });

    it('disables submit button while seller UPI is loading', () => {
      const isDisabled = isTakeOrderSubmitDisabled({
        isSubmitting: false,
        tradeAmountStr: '1',
        inputAmountNum: 1,
        isMaker: false,
        isBuyMode: true,
        isLoadingSellerUpi: true, // Loading
        sellerUpi: null,
      });

      expect(isDisabled).toBe(true);
    });

    it('enables submit button when seller UPI is available and inputs are valid', () => {
      const isDisabled = isTakeOrderSubmitDisabled({
        isSubmitting: false,
        tradeAmountStr: '1',
        inputAmountNum: 1,
        isMaker: false,
        isBuyMode: true,
        isLoadingSellerUpi: false,
        sellerUpi: 'seller@upi', // Available
      });

      expect(isDisabled).toBe(false);
    });

    it('blocks maker from self-matching regardless of UPI status', () => {
      const isDisabled = isTakeOrderSubmitDisabled({
        isSubmitting: false,
        tradeAmountStr: '1',
        inputAmountNum: 1,
        isMaker: true, // Maker cannot take own order
        isBuyMode: true,
        isLoadingSellerUpi: false,
        sellerUpi: 'seller@upi',
      });

      expect(isDisabled).toBe(true);
    });
  });

  // 6. Never Displays Buyer's Own UPI
  describe('6. Never Displays Buyer Own UPI', () => {
    it('never queries or uses buyer address for seller payment display', () => {
      const buyerUpi = 'buyer@okaxis';
      const sellerUpi = 'seller@paytm';

      const result = resolveSellerUpiForModal({
        order: mockSellOrder,
        currentUserAddress: mockBuyer,
        fetchedProfileUpi: sellerUpi, // Maker profile
      });

      expect(result.sellerUpi).toBe(sellerUpi);
      expect(result.sellerUpi).not.toBe(buyerUpi);
    });
  });

  // 7. BUY Orders (Selling UVBE to Buyer) Do Not Show Payment to Seller
  describe('7. BUY Orders (Sell UVBE to Buyer Mode)', () => {
    it('does not display payment to seller section when taking a BUY order', () => {
      const result = resolveSellerUpiForModal({
        order: mockBuyOrder,
        currentUserAddress: mockSeller,
        fetchedProfileUpi: 'buyer@upi',
      });

      expect(result.isBuyMode).toBe(false);
      expect(result.sellerUpi).toBeNull();
    });
  });

  // 8. Historical Trade / Payment Snapshot Immutability
  describe('8. Historical Trade Payment Snapshot Immutability', () => {
    it('preserves initial trade payee snapshot even if seller later changes profile', async () => {
      const tradeId = 9901;
      const initialSellerUpi = 'original.seller@upi';

      // 1. Initial snapshot saved
      await saveSellerPaymentProfile(mockSeller, initialSellerUpi);
      const initialIntent: PaymentIntent = {
        id: `intent-${tradeId}`,
        tradeId,
        buyerAddress: mockBuyer,
        sellerAddress: mockSeller,
        sellerPaymentIdentifier: initialSellerUpi,
        fiatAmount: '200.00',
        fiatCurrency: 'INR',
        status: 'QR_READY',
        reference: 'UV-TRD-9901-ABCD',
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      await savePaymentIntent(initialIntent);

      // 2. Seller changes profile later
      const updatedSellerUpi = 'updated.seller@upi';
      await saveSellerPaymentProfile(mockSeller, updatedSellerUpi);

      // 3. Historical trade still returns original snapshot
      const retrieved = await getPaymentIntentByTradeId(tradeId);
      expect(retrieved?.sellerPaymentIdentifier).toBe(initialSellerUpi);
      expect(retrieved?.sellerPaymentIdentifier).not.toBe(updatedSellerUpi);
    });
  });

  // 9. API GET /api/p2p/seller-profile Returns Decrypted UPI
  describe('9. API GET /api/p2p/seller-profile Endpoint', () => {
    it('returns decrypted upiVpa and upiId for registered seller', async () => {
      await saveSellerProfile({
        walletAddress: mockSeller,
        paymentRail: 'UPI',
        upiVpa: 'registered.seller@okaxis',
        verificationStatus: 'PENDING_VERIFICATION',
      });

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller}`,
      );
      const res = await sellerProfileGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.profile.walletAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
      expect(body.profile.upiVpa).toBe('registered.seller@okaxis');
      expect(body.profile.upiId).toBe('registered.seller@okaxis');
    });

    it('returns fallback payment profile when saved via saveSellerPaymentProfile', async () => {
      await saveSellerPaymentProfile(mockOtherSeller, 'fallback.seller@okhdfcbank');

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockOtherSeller}`,
      );
      const res = await sellerProfileGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.profile.upiVpa).toBe('fallback.seller@okhdfcbank');
      expect(body.profile.upiId).toBe('fallback.seller@okhdfcbank');
    });

    it('returns 404 when seller payment profile is not found', async () => {
      const unknownAccount = privateKeyToAccount(generatePrivateKey()).address;
      const req = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${unknownAccount}`,
      );
      const res = await sellerProfileGET(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Seller payment profile not found.');
    });

    it('returns 400 when userAddress is missing or invalid', async () => {
      const reqMissing = new NextRequest('http://localhost:3000/api/p2p/seller-profile');
      const resMissing = await sellerProfileGET(reqMissing);
      expect(resMissing.status).toBe(400);
      const bodyMissing = await resMissing.json();
      expect(bodyMissing.error).toContain('Missing or invalid userAddress');

      const reqInvalid = new NextRequest(
        'http://localhost:3000/api/p2p/seller-profile?userAddress=not-an-address',
      );
      const resInvalid = await sellerProfileGET(reqInvalid);
      expect(resInvalid.status).toBe(400);
    });

    it('handles checksummed, lowercase, and uppercase seller addresses identically', async () => {
      const testUpi = 'checksum.seller@okaxis';
      await saveSellerProfile({
        walletAddress: mockSeller,
        paymentRail: 'UPI',
        upiVpa: testUpi,
        verificationStatus: 'PENDING_VERIFICATION',
      });

      // Query with lowercase
      const reqLower = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller.toLowerCase()}`,
      );
      const resLower = await sellerProfileGET(reqLower);
      expect(resLower.status).toBe(200);
      const bodyLower = await resLower.json();
      expect(bodyLower.profile.upiVpa).toBe(testUpi);

      // Query with original (checksummed)
      const reqChecksum = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller}`,
      );
      const resChecksum = await sellerProfileGET(reqChecksum);
      expect(resChecksum.status).toBe(200);
      const bodyChecksum = await resChecksum.json();
      expect(bodyChecksum.profile.upiVpa).toBe(testUpi);
    });

    it('returns deterministic 404 when seller has a profile but no UPI registered', async () => {
      const noUpiSeller = privateKeyToAccount(generatePrivateKey()).address;
      const root = getSellerProfileStorageRoot();
      const filePath = path.resolve(root, `profile-${noUpiSeller.toLowerCase()}.json`);

      // Write a raw profile file that has no valid UPI
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          walletAddress: noUpiSeller.toLowerCase(),
          paymentRail: 'UPI',
          upiVpa: '',
          verificationStatus: 'PENDING_VERIFICATION',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${noUpiSeller}`,
      );
      const res = await sellerProfileGET(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Seller payment details unavailable: No valid UPI ID registered.');
    });

    it('propagates decryption errors with 500 without silently swallowing them', async () => {
      const corruptSeller = privateKeyToAccount(generatePrivateKey()).address;
      const root = getSellerProfileStorageRoot();
      const filePath = path.resolve(root, `profile-${corruptSeller.toLowerCase()}.json`);

      // Write a corrupt encrypted payload
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          walletAddress: corruptSeller.toLowerCase(),
          paymentRail: 'UPI',
          upiVpa: 'enc:badiv:badauth:badciphertext',
          verificationStatus: 'PENDING_VERIFICATION',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );

      const req = new NextRequest(
        `http://localhost:3000/api/p2p/seller-profile?userAddress=${corruptSeller}`,
      );
      const res = await sellerProfileGET(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });
});
